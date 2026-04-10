import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("../services/database.js", () => ({
  prisma: {
    analysisRequest: {
      findFirst: mockFindFirst,
      create: mockCreate,
      findUnique: mockFindUnique,
    },
  },
}));

const mockPublish = vi.fn().mockReturnValue(true);
vi.mock("../events/publisher.js", () => ({
  publishWalletDataRequested: mockPublish,
  publishUserAnalysisConsumed: vi.fn().mockReturnValue(true),
}));

const mockCheckUsage = vi.fn().mockResolvedValue({
  allowed: true,
  remaining: 4,
  limit: 5,
  resetsAt: new Date().toISOString(),
});
vi.mock("../services/users-service.js", () => ({
  checkUsage: mockCheckUsage,
  UsersServiceError: class UsersServiceError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = "UsersServiceError";
      this.statusCode = statusCode;
    }
  },
}));

describe("api-gateway HTTP server (Fastify)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckUsage.mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetsAt: new Date().toISOString(),
    });
  });

  describe("POST /analysis", () => {
    it("deve criar análise e retornar 202 com requestId", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "req-001",
        status: "PENDING",
        chain: "ethereum",
        address: "0xabc",
        userId: "user-1",
        requestedAt: new Date(),
      });

      const res = await app.inject({
        method: "POST",
        url: "/analysis",
        payload: { chain: "ethereum", address: "0xabc", userId: "user-1" },
      });

      expect(res.statusCode).toBe(202);
      expect(res.json()).toMatchObject({
        requestId: "req-001",
        status: "pending",
      });
      expect(mockPublish).toHaveBeenCalledWith({
        requestId: "req-001",
        userId: "user-1",
        chain: "ethereum",
        address: "0xabc",
      });

      await app.close();
    });

    it("deve retornar 200 com request existente quando já há análise em andamento", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindFirst.mockResolvedValue({
        id: "req-existing",
        status: "PROCESSING",
      });

      const res = await app.inject({
        method: "POST",
        url: "/analysis",
        payload: { chain: "ethereum", address: "0xabc", userId: "user-1" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        requestId: "req-existing",
        status: "processing",
      });
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();

      await app.close();
    });

    it("deve retornar 429 quando limite de uso do usuário foi atingido", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindFirst.mockResolvedValue(null);
      const { UsersServiceError } = await import(
        "../services/users-service.js"
      );
      mockCheckUsage.mockRejectedValue(
        new UsersServiceError("Usage limit exceeded", 429)
      );

      const res = await app.inject({
        method: "POST",
        url: "/analysis",
        payload: { chain: "ethereum", address: "0xabc", userId: "user-1" },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json()).toMatchObject({
        error: "Usage limit exceeded for this billing period",
      });
      expect(mockCreate).not.toHaveBeenCalled();

      await app.close();
    });

    it("deve retornar 400 quando body é inválido", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      const res = await app.inject({
        method: "POST",
        url: "/analysis",
        payload: { chain: "ethereum" }, // faltando address e userId
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: "Invalid body" });

      await app.close();
    });
  });

  describe("GET /analysis/:id", () => {
    it("deve retornar 404 quando request não existe", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: "GET",
        url: "/analysis/req-nao-existe",
      });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: "Analysis request not found" });

      await app.close();
    });

    it("deve retornar status pending sem result quando PENDING", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindUnique.mockResolvedValue({
        id: "req-001",
        status: "PENDING",
        chain: "ethereum",
        address: "0xabc",
      });

      const res = await app.inject({ method: "GET", url: "/analysis/req-001" });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.status).toBe("pending");
      expect(body.result).toBeUndefined();

      await app.close();
    });

    it("deve retornar resultado completo quando COMPLETED", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindUnique.mockResolvedValue({
        id: "req-001",
        status: "COMPLETED",
        chain: "ethereum",
        address: "0xabc",
        score: 85,
        confidence: 0.9,
        reasoning: "Wallet trustworthy",
        positiveFactors: ["Old wallet"],
        riskFactors: [],
        modelVersion: "gpt-4o-mini",
        promptVersion: "v1.0",
      });

      const res = await app.inject({ method: "GET", url: "/analysis/req-001" });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.status).toBe("completed");
      expect(body.result.score).toBe(85);

      await app.close();
    });

    it("deve retornar failed sem result quando FAILED", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindUnique.mockResolvedValue({
        id: "req-001",
        status: "FAILED",
        chain: "ethereum",
        address: "0xabc",
        failureReason: "AI service unavailable",
      });

      const res = await app.inject({ method: "GET", url: "/analysis/req-001" });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.status).toBe("failed");
      expect(body.result).toBeUndefined();

      await app.close();
    });
  });

  describe("GET /health", () => {
    it("deve retornar status ok", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      const res = await app.inject({ method: "GET", url: "/health" });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: "ok" });

      await app.close();
    });
  });
});
