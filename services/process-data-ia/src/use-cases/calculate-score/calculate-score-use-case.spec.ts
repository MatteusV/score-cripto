import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProcessedData } from "../../generated/prisma/client";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { ProcessedDataInMemoryRepository } from "../../repositories/in-memory/processed-data-in-memory-repository";
import type { WalletContextInput } from "../../schemas/score";
import { CreateAnalysisRequestUseCase } from "../analysis-request/create-analysis-request-use-case";
import { GetAnalysisByChainAddressUserUseCase } from "../analysis-request/get-analysis-by-chain-address-user-use-case";
import { UpdateStatusToProcessingUseCase } from "../analysis-request/update-status-to-processing-use-case";
import { UpdateStatusToCompletedUseCase } from "../analysis-request/update-status-to-completed-use-case";
import { GetCachedScoreUseCase } from "../processed-data/get-cached-score-use-case";
import { PersistScoreUseCase } from "../processed-data/persist-score-use-case";
import { CalculateScoreUseCase } from "./calculate-score-use-case";

describe("CalculateScoreUseCase", () => {
	let analysisRepo: AnalysisRequestInMemoryRepository;
	let processedDataRepo: ProcessedDataInMemoryRepository;
	let sut: CalculateScoreUseCase;

	const walletContext: WalletContextInput = {
		chain: "ethereum",
		address: "0x123",
		tx_count: 50,
		total_volume: 100,
		unique_counterparties: 10,
		wallet_age_days: 365,
		largest_tx_ratio: 0.5,
		avg_tx_value: 2,
		has_mixer_interaction: false,
		has_sanctioned_interaction: false,
		token_diversity: 5,
		nft_activity: true,
		defi_interactions: 3,
		risk_flags: [],
	};

	const mockPublishEvent = vi.fn();
	const mockScoreWithAI = vi.fn();

	beforeEach(() => {
		analysisRepo = new AnalysisRequestInMemoryRepository();
		processedDataRepo = new ProcessedDataInMemoryRepository();

		const getByChainAddressUser = new GetAnalysisByChainAddressUserUseCase(analysisRepo);
		const createAnalysis = new CreateAnalysisRequestUseCase(
			analysisRepo,
			getByChainAddressUser,
		);
		const updateToProcessing = new UpdateStatusToProcessingUseCase(analysisRepo);
		const updateToCompleted = new UpdateStatusToCompletedUseCase(analysisRepo);
		const getCachedScore = new GetCachedScoreUseCase(processedDataRepo);
		const persistScore = new PersistScoreUseCase(processedDataRepo, 24);

		mockPublishEvent.mockClear();
		mockScoreWithAI.mockClear();
		mockScoreWithAI.mockResolvedValue({
			output: {
				score: 85,
				confidence: 0.9,
				reasoning: "High trust wallet",
				positiveFactors: ["Old wallet", "High tx count"],
				riskFactors: [],
			},
			modelVersion: "gpt-4o-mini",
			promptVersion: "v1.0",
			tokensUsed: 150,
			cost: 0.0001,
			durationMs: 500,
		});

		sut = new CalculateScoreUseCase(
			getCachedScore,
			createAnalysis,
			updateToProcessing,
			persistScore,
			updateToCompleted,
			mockScoreWithAI,
			mockPublishEvent,
		);
	});

	it("should return cached score if available and valid", async () => {
		const cached: Omit<ProcessedData, "id" | "createdAt"> = {
			analysisRequestId: "req-1",
			userId: "user-1",
			chain: "ethereum",
			address: "0x123",
			score: 90,
			confidence: 0.95,
			reasoning: "Cached",
			positiveFactors: ["Cached"],
			riskFactors: [],
			modelVersion: "gpt-4o-mini",
			promptVersion: "v1.0",
			tokensUsed: 100,
			cost: 0.0001,
			inferenceDurationMs: 300,
			validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
		};

		await processedDataRepo.create(cached);

		const result = await sut.execute({
			walletContext,
			userId: "user-1",
			walletContextHash: "hash-1",
		});

		expect(result.processedData.score).toBe(90);
		expect(result.cachedResult).toBe(true);
		expect(mockScoreWithAI).not.toHaveBeenCalled();
	});

	it("should create new analysis and calculate score if no cache", async () => {
		const result = await sut.execute({
			walletContext,
			userId: "user-1",
			walletContextHash: "hash-1",
		});

		expect(result.processedData).toBeDefined();
		expect(result.processedData.score).toBe(85);
		expect(result.cachedResult).toBe(false);
		expect(mockScoreWithAI).toHaveBeenCalledWith(walletContext);
		expect(mockPublishEvent).toHaveBeenCalledWith(
			"wallet.score.calculated",
			expect.objectContaining({
				processId: expect.any(String),
				chain: "ethereum",
				address: "0x123",
				score: 85,
			}),
		);
	});

	it("should update analysis request status through lifecycle", async () => {
		await sut.execute({
			walletContext,
			userId: "user-1",
			walletContextHash: "hash-1",
		});

		const analysisRequests = analysisRepo.items;
		expect(analysisRequests.length).toBe(1);
		const analysis = analysisRequests[0];

		expect(analysis.status).toBe("COMPLETED");
		expect(analysis.processingAt).toBeDefined();
		expect(analysis.completedAt).toBeDefined();
	});

	it("should persist score with correct metadata", async () => {
		const result = await sut.execute({
			walletContext,
			userId: "user-1",
			walletContextHash: "hash-1",
		});

		expect(result.processedData.userId).toBe("user-1");
		expect(result.processedData.chain).toBe("ethereum");
		expect(result.processedData.address).toBe("0x123");
		expect(result.processedData.score).toBe(85);
		expect(result.processedData.confidence).toBe(0.9);
		expect(result.processedData.modelVersion).toBe("gpt-4o-mini");
		expect(result.processedData.promptVersion).toBe("v1.0");
	});
});
