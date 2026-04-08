import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("../config.js", () => ({
  config: {
    port: 3001,
    databaseUrl: "postgresql://test",
    rabbitmqUrl: "amqp://localhost",
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

describe("api-gateway consumer handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleScoreCalculated", () => {
    it("deve atualizar status para COMPLETED com resultado", async () => {
      const { handleScoreCalculated } = await import("./consumer.js");
      mockFindUnique.mockResolvedValue({ id: "req-001", status: "PROCESSING" });
      mockUpdate.mockResolvedValue({});

      const payload = JSON.stringify({
        event: "wallet.score.calculated",
        timestamp: new Date().toISOString(),
        data: {
          processId: "req-001",
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
    });

    it("deve lançar erro para payload inválido", async () => {
      const { handleScoreCalculated } = await import("./consumer.js");
      const invalid = JSON.stringify({ event: "wallet.score.calculated", data: {} });

      await expect(handleScoreCalculated(invalid)).rejects.toThrow("invalid_payload");
    });
  });

  describe("handleScoreFailed", () => {
    it("deve atualizar status para FAILED com reason", async () => {
      const { handleScoreFailed } = await import("./consumer.js");
      mockFindUnique.mockResolvedValue({ id: "req-001", status: "PROCESSING" });
      mockUpdate.mockResolvedValue({});

      const payload = JSON.stringify({
        event: "wallet.score.failed",
        timestamp: new Date().toISOString(),
        data: {
          processId: "req-001",
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
    });
  });
});
