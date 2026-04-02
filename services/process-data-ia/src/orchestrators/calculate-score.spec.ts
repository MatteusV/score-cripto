import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../repositories/in-memory/analysis-request-in-memory-repository";
import { ProcessedDataInMemoryRepository } from "../repositories/in-memory/processed-data-in-memory-repository";
import type { WalletContextInput } from "../schemas/score";
import { CreateAnalysisRequestUseCase } from "../use-cases/analysis-request/create-analysis-request-use-case";
import { UpdateStatusToCompletedUseCase } from "../use-cases/analysis-request/update-status-to-completed-use-case";
import { UpdateStatusToFailedUseCase } from "../use-cases/analysis-request/update-status-to-failed-use-case";
import { UpdateStatusToProcessingUseCase } from "../use-cases/analysis-request/update-status-to-processing-use-case";
import { GetCachedScoreUseCase } from "../use-cases/processed-data/get-cached-score-use-case";
import { PersistScoreUseCase } from "../use-cases/processed-data/persist-score-use-case";
import { CalculateScore, hashWalletContext } from "./calculate-score";

const walletContext: WalletContextInput = {
  chain: "ethereum",
  address: "0xabc",
  tx_count: 50,
  total_volume: 100,
  unique_counterparties: 10,
  wallet_age_days: 365,
  largest_tx_ratio: 0.3,
  avg_tx_value: 2,
  has_mixer_interaction: false,
  has_sanctioned_interaction: false,
  token_diversity: 5,
  nft_activity: true,
  defi_interactions: 3,
  risk_flags: [],
};

const mockAIResult = {
  output: {
    score: 85,
    confidence: 0.9,
    reasoning: "High trust wallet",
    positiveFactors: ["Old wallet"],
    riskFactors: [],
  },
  modelVersion: "gpt-4o-mini",
  promptVersion: "v1.0",
  tokensUsed: 150,
  cost: 0.0001,
  durationMs: 500,
};

describe("CalculateScore (orchestrator)", () => {
  let analysisRepo: AnalysisRequestInMemoryRepository;
  let processedDataRepo: ProcessedDataInMemoryRepository;
  let scoringFn: ReturnType<typeof vi.fn>;
  let publishFn: ReturnType<typeof vi.fn>;
  let sut: CalculateScore;

  beforeEach(() => {
    analysisRepo = new AnalysisRequestInMemoryRepository();
    processedDataRepo = new ProcessedDataInMemoryRepository();
    scoringFn = vi.fn().mockResolvedValue(mockAIResult);
    publishFn = vi.fn().mockReturnValue(true);

    sut = new CalculateScore(
      new GetCachedScoreUseCase(processedDataRepo),
      new CreateAnalysisRequestUseCase(analysisRepo),
      new UpdateStatusToProcessingUseCase(analysisRepo),
      new UpdateStatusToCompletedUseCase(analysisRepo),
      new UpdateStatusToFailedUseCase(analysisRepo),
      new PersistScoreUseCase(processedDataRepo, 24),
      scoringFn,
      publishFn
    );
  });

  describe("cache hit", () => {
    it("should return cached score without calling AI", async () => {
      const cached = {
        analysisRequestId: "req-1",
        userId: "user-1",
        chain: "ethereum",
        address: "0xabc",
        walletContextHash: hashWalletContext(walletContext),
        score: 90,
        confidence: 0.95,
        reasoning: "Cached result",
        positiveFactors: ["Old wallet"],
        riskFactors: [],
        modelVersion: "gpt-4o-mini",
        promptVersion: "v1.0",
        tokensUsed: 100,
        cost: 0.0001,
        inferenceDurationMs: 300,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      await processedDataRepo.create(cached);

      const result = await sut.execute({ walletContext, userId: "user-1" });

      expect(result.cachedResult).toBe(true);
      expect(result.processedData.score).toBe(90);
      expect(scoringFn).not.toHaveBeenCalled();
      expect(publishFn).not.toHaveBeenCalled();
    });
  });

  describe("full scoring flow", () => {
    it("should calculate score and persist result", async () => {
      const result = await sut.execute({ walletContext, userId: "user-1" });

      expect(result.cachedResult).toBe(false);
      expect(result.processedData.score).toBe(85);
      expect(result.processedData.confidence).toBe(0.9);
      expect(result.processedData.userId).toBe("user-1");
      expect(result.processedData.chain).toBe("ethereum");
      expect(result.processedData.address).toBe("0xabc");
      expect(result.processedData.modelVersion).toBe("gpt-4o-mini");
      expect(result.processedData.walletContextHash).toBeTruthy();
    });

    it("should transition analysis request: PENDING → PROCESSING → COMPLETED", async () => {
      await sut.execute({ walletContext, userId: "user-1" });

      const analysis = analysisRepo.items[0];
      expect(analysis.status).toBe("COMPLETED");
      expect(analysis.processingAt).not.toBeNull();
      expect(analysis.completedAt).not.toBeNull();
      expect(analysis.failedAt).toBeNull();
    });

    it("should publish wallet.score.calculated event", async () => {
      await sut.execute({ walletContext, userId: "user-1" });

      expect(publishFn).toHaveBeenCalledOnce();
      expect(publishFn).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: "ethereum",
          address: "0xabc",
          score: 85,
          reasoning: "High trust wallet",
          positiveFactors: ["Old wallet"],
          riskFactors: [],
          modelVersion: "gpt-4o-mini",
        })
      );
    });

    it("should call scoringFn with the wallet context", async () => {
      await sut.execute({ walletContext, userId: "user-1" });

      expect(scoringFn).toHaveBeenCalledOnce();
      expect(scoringFn).toHaveBeenCalledWith(walletContext);
    });
  });

  describe("AI failure fallback", () => {
    it("should use heuristic and complete successfully when AI fails", async () => {
      scoringFn.mockRejectedValue(new Error("OpenAI timeout"));

      const result = await sut.execute({ walletContext, userId: "user-1" });

      expect(result.cachedResult).toBe(false);
      expect(result.processedData.modelVersion).toBe("heuristic-v1");
      expect(result.processedData.score).toBeGreaterThanOrEqual(0);
      expect(result.processedData.score).toBeLessThanOrEqual(100);
    });

    it("should mark as FAILED then back to PROCESSING when AI fails", async () => {
      scoringFn.mockRejectedValue(new Error("OpenAI timeout"));

      await sut.execute({ walletContext, userId: "user-1" });

      const analysis = analysisRepo.items[0];
      // After fallback flow: ends as COMPLETED (heuristic succeeded)
      expect(analysis.status).toBe("COMPLETED");
      expect(analysis.failedAt).not.toBeNull();
      expect(analysis.failureReason).toBe("OpenAI timeout");
    });
  });

  describe("deduplication", () => {
    it("should reuse existing PENDING request on duplicate call", async () => {
      await sut.execute({ walletContext, userId: "user-1" });
      await sut.execute({ walletContext, userId: "user-1" });

      // Second call hits cache — only 1 analysis request created
      expect(analysisRepo.items.length).toBe(1);
    });
  });
});
