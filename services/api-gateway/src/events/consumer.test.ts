import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("../config.js", () => ({
  config: {
    port: 3001,
    databaseUrl: "postgresql://test",
    rabbitmqUrl: "amqp://localhost",
    usersServiceUrl: "http://users:3003",
  },
}));

vi.mock("../services/database.js", () => ({
  prisma: {
    analysisRequest: {
      update: mockUpdate,
      findUnique: mockFindUnique,
    },
  },
}));

const mockPublishConsumed = vi.fn().mockReturnValue(true);
vi.mock("../events/publisher.js", () => ({
  publishUserAnalysisConsumed: mockPublishConsumed,
}));

describe("api-gateway consumer handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleScoreCalculated", () => {
    it("deve atualizar status para COMPLETED com resultado", async () => {
      const { handleScoreCalculated } = await import("./consumer.js");
      mockFindUnique.mockResolvedValue({ id: "req-001", status: "PROCESSING" });
      mockUpdate.mockResolvedValue({
        id: "req-001",
        userId: "user-1",
        chain: "ethereum",
        address: "0xabc",
        status: "COMPLETED",
        score: 85,
        confidence: 0.9,
        reasoning: "Trustworthy",
        positiveFactors: ["Old wallet"],
        riskFactors: [],
        modelVersion: "gpt-4o-mini",
        promptVersion: "v1.0",
        requestedAt: new Date(),
        completedAt: new Date(),
        failureReason: null,
      });

      const payload = JSON.stringify({
        event: "wallet.score.calculated",
        timestamp: new Date().toISOString(),
        data: {
          requestId: "req-001",
          chain: "ethereum",
          address: "0xabc",
          score: 85,
          confidence: 0.9,
          reasoning: "Trustworthy",
          positiveFactors: ["Old wallet"],
          riskFactors: [],
          modelVersion: "gpt-4o-mini",
          promptVersion: "v1.0",
        },
      });

      await handleScoreCalculated(payload);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "req-001" },
        data: expect.objectContaining({
          status: "COMPLETED",
          score: 85,
          confidence: 0.9,
        }),
      });
      expect(mockPublishConsumed).toHaveBeenCalledWith({
        userId: "user-1",
        analysisId: "req-001",
        status: "completed",
        chain: "ethereum",
        address: "0xabc",
      });
    });

    it("deve lançar erro para payload inválido", async () => {
      const { handleScoreCalculated } = await import("./consumer.js");
      const invalid = JSON.stringify({
        event: "wallet.score.calculated",
        data: {},
      });

      await expect(handleScoreCalculated(invalid)).rejects.toThrow(
        "invalid_payload"
      );
    });
  });

  describe("handleScoreFailed", () => {
    it("deve atualizar status para FAILED com reason e publicar evento de consumo", async () => {
      const { handleScoreFailed } = await import("./consumer.js");
      mockFindUnique.mockResolvedValue({ id: "req-001", status: "PROCESSING" });
      mockUpdate.mockResolvedValue({
        id: "req-001",
        userId: "user-1",
        chain: "ethereum",
        address: "0xabc",
        status: "FAILED",
        score: null,
        confidence: null,
        reasoning: null,
        positiveFactors: [],
        riskFactors: [],
        modelVersion: null,
        promptVersion: null,
        requestedAt: new Date(),
        completedAt: null,
        failureReason: "AI service error",
      });

      const payload = JSON.stringify({
        event: "wallet.score.failed",
        timestamp: new Date().toISOString(),
        data: {
          requestId: "req-001",
          reason: "AI service error",
        },
      });

      await handleScoreFailed(payload);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "req-001" },
        data: expect.objectContaining({
          status: "FAILED",
          failureReason: "AI service error",
        }),
      });
      expect(mockPublishConsumed).toHaveBeenCalledWith({
        userId: "user-1",
        analysisId: "req-001",
        status: "failed",
        chain: "ethereum",
        address: "0xabc",
      });
    });
  });
});
