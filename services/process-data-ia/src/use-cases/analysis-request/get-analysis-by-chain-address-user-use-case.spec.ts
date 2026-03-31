import { describe, it, expect } from "vitest";
import type { AnalysisRequest } from "../../generated/prisma/client";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { GetAnalysisByChainAddressUserUseCase } from "./get-analysis-by-chain-address-user-use-case";

describe("GetAnalysisByChainAddressUserUseCase", () => {
	it("should return analysis when found", async () => {
		const repo = new AnalysisRequestInMemoryRepository();
		const sut = new GetAnalysisByChainAddressUserUseCase(repo);

		const analysisRequest: Omit<AnalysisRequest, "id"> = {
			userId: "user-1",
			chain: "ethereum",
			address: "0x123",
			status: "PENDING",
			walletContextHash: "hash-1",
			requestedAt: new Date(),
			processingAt: null,
			completedAt: null,
			failedAt: null,
			failureReason: null,
		};

		await repo.create(analysisRequest);

		const result = await sut.execute({
			chain: "ethereum",
			address: "0x123",
			userId: "user-1",
		});

		expect(result.analysisRequest).toBeDefined();
		expect(result.analysisRequest.chain).toBe("ethereum");
		expect(result.analysisRequest.address).toBe("0x123");
		expect(result.analysisRequest.userId).toBe("user-1");
	});

	it("should return null when analysis not found", async () => {
		const repo = new AnalysisRequestInMemoryRepository();
		const sut = new GetAnalysisByChainAddressUserUseCase(repo);

		const result = await sut.execute({
			chain: "ethereum",
			address: "0x456",
			userId: "user-2",
		});

		expect(result.analysisRequest).toBeNull();
	});

	it("should isolate by userId", async () => {
		const repo = new AnalysisRequestInMemoryRepository();
		const sut = new GetAnalysisByChainAddressUserUseCase(repo);

		const analysisRequest1: Omit<AnalysisRequest, "id"> = {
			userId: "user-1",
			chain: "ethereum",
			address: "0x123",
			status: "PENDING",
			walletContextHash: "hash-1",
			requestedAt: new Date(),
			processingAt: null,
			completedAt: null,
			failedAt: null,
			failureReason: null,
		};

		await repo.create(analysisRequest1);

		const result = await sut.execute({
			chain: "ethereum",
			address: "0x123",
			userId: "user-2",
		});

		expect(result.analysisRequest).toBeNull();
	});

	it("should isolate by chain and address", async () => {
		const repo = new AnalysisRequestInMemoryRepository();
		const sut = new GetAnalysisByChainAddressUserUseCase(repo);

		const analysisRequest: Omit<AnalysisRequest, "id"> = {
			userId: "user-1",
			chain: "ethereum",
			address: "0x123",
			status: "PENDING",
			walletContextHash: "hash-1",
			requestedAt: new Date(),
			processingAt: null,
			completedAt: null,
			failedAt: null,
			failureReason: null,
		};

		await repo.create(analysisRequest);

		const resultDifferentChain = await sut.execute({
			chain: "polygon",
			address: "0x123",
			userId: "user-1",
		});

		const resultDifferentAddress = await sut.execute({
			chain: "ethereum",
			address: "0x456",
			userId: "user-1",
		});

		expect(resultDifferentChain.analysisRequest).toBeNull();
		expect(resultDifferentAddress.analysisRequest).toBeNull();
	});
});
