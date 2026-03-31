import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockWalletContext } from "./setup.js";

const { mockPrismaProcessedData, mockPrismaAnalysisRequest } = vi.hoisted(
  () => {
    const mockPrismaProcessedData = {
      findFirst: vi.fn(),
      create: vi.fn(),
    };
    const mockPrismaAnalysisRequest = {
      create: vi.fn(),
      update: vi.fn(),
    };
    return { mockPrismaProcessedData, mockPrismaAnalysisRequest };
  }
);

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      processedData: mockPrismaProcessedData,
      analysisRequest: mockPrismaAnalysisRequest,
    })),
  };
});

vi.mock("../src/services/scoring.js", () => ({
  scoreWithAI: vi.fn().mockResolvedValue({
    output: {
      score: 82,
      confidence: 0.91,
      reasoning: "Healthy wallet with diverse activity",
      positiveFactors: ["Old wallet", "High tx count"],
      riskFactors: [],
    },
    modelVersion: "gpt-4o-mini",
    promptVersion: "v1.0",
    tokensUsed: 500,
    cost: 0.0003,
    durationMs: 1200,
  }),
  scoreWithHeuristic: vi.fn().mockReturnValue({
    score: 75,
    confidence: 0.6,
    reasoning: "Heuristic fallback",
    positiveFactors: ["Old wallet"],
    riskFactors: [],
  }),
}));

vi.mock("../src/events/publisher.js", () => ({
  publishScoreCalculated: vi.fn().mockResolvedValue(true),
  connectRabbitMQ: vi.fn().mockResolvedValue(undefined),
  disconnectRabbitMQ: vi.fn().mockResolvedValue(undefined),
}));

import { scoreRoutes } from "../src/routes/score.js";

describe("POST /score", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.register(scoreRoutes);
    await app.ready();
  });

  it("should return 400 for invalid input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/score",
      payload: { chain: "ethereum" },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Invalid wallet context input");
  });

  it("should return 400 for empty body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/score",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return cached score when valid score exists", async () => {
    const validUntil = new Date(Date.now() + 3_600_000);
    const createdAt = new Date();

    mockPrismaProcessedData.findFirst.mockResolvedValueOnce({
      analysisRequestId: "cached-123",
      chain: "ethereum",
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
      score: 85,
      confidence: 0.9,
      reasoning: "Cached result",
      positiveFactors: ["factor1"],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      validUntil,
      createdAt,
      analysisRequest: { id: "cached-123" },
    });

    const response = await app.inject({
      method: "POST",
      url: "/score",
      payload: createMockWalletContext(),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.cachedResult).toBe(true);
    expect(body.processId).toBe("cached-123");
    expect(body.score).toBe(85);
    expect(mockPrismaProcessedData.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          analysisRequest: {
            is: expect.objectContaining({
              walletContextHash: expect.any(String),
            }),
          },
        }),
      })
    );
  });

  it("should generate new score when no cached score exists", async () => {
    mockPrismaProcessedData.findFirst.mockResolvedValueOnce(null);
    mockPrismaAnalysisRequest.create.mockResolvedValueOnce({
      id: "new-123",
      chain: "ethereum",
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
      status: "PROCESSING",
    });
    mockPrismaProcessedData.create.mockResolvedValueOnce({
      id: "pd-123",
      analysisRequestId: "new-123",
      createdAt: new Date(),
    });
    mockPrismaAnalysisRequest.update.mockResolvedValueOnce({});

    const response = await app.inject({
      method: "POST",
      url: "/score",
      payload: createMockWalletContext(),
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.cachedResult).toBe(false);
    expect(body.processId).toBe("new-123");
    expect(body.score).toBe(82);
    expect(body.confidence).toBe(0.91);
  });

  it("should return score with all expected fields", async () => {
    mockPrismaProcessedData.findFirst.mockResolvedValueOnce(null);
    mockPrismaAnalysisRequest.create.mockResolvedValueOnce({
      id: "fields-123",
      chain: "ethereum",
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
      status: "PROCESSING",
    });
    mockPrismaProcessedData.create.mockResolvedValueOnce({
      id: "pd-456",
      analysisRequestId: "fields-123",
      createdAt: new Date(),
    });
    mockPrismaAnalysisRequest.update.mockResolvedValueOnce({});

    const response = await app.inject({
      method: "POST",
      url: "/score",
      payload: createMockWalletContext(),
    });

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("processId");
    expect(body).toHaveProperty("chain");
    expect(body).toHaveProperty("address");
    expect(body).toHaveProperty("score");
    expect(body).toHaveProperty("confidence");
    expect(body).toHaveProperty("reasoning");
    expect(body).toHaveProperty("positiveFactors");
    expect(body).toHaveProperty("riskFactors");
    expect(body).toHaveProperty("modelVersion");
    expect(body).toHaveProperty("promptVersion");
    expect(body).toHaveProperty("cachedResult");
    expect(body).toHaveProperty("validUntil");
    expect(body).toHaveProperty("createdAt");
  });
});

describe("GET /score/:processId", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.register(scoreRoutes);
    await app.ready();
  });

  it("should return 404 when score not found", async () => {
    mockPrismaProcessedData.findFirst.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "GET",
      url: "/score/nonexistent-id",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Score not found");
  });

  it("should return existing score by processId", async () => {
    const validUntil = new Date(Date.now() + 3_600_000);
    const createdAt = new Date();

    mockPrismaProcessedData.findFirst.mockResolvedValueOnce({
      analysisRequestId: "existing-123",
      chain: "ethereum",
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
      score: 78,
      confidence: 0.85,
      reasoning: "Moderate trust",
      positiveFactors: ["Active DeFi usage"],
      riskFactors: ["Few counterparties"],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      validUntil,
      createdAt,
      analysisRequest: { id: "existing-123" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/score/existing-123",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.processId).toBe("existing-123");
    expect(body.score).toBe(78);
    expect(body.confidence).toBe(0.85);
  });
});
