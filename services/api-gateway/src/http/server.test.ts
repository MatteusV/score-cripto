import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

// TEST_JWT_PRIVATE_KEY é gerado pelo vitest.config.ts e disponível para assinar tokens nos testes
const TEST_PRIVATE_KEY = process.env.TEST_JWT_PRIVATE_KEY as string;

function signToken(userId = "user-test-1") {
  return jwt.sign(
    { sub: userId, email: "test@example.com" },
    TEST_PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "15m" }
  );
}

const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockAggregate = vi.fn();
const mockCounterUpsert = vi.fn();

vi.mock("../services/database.js", () => ({
  prisma: {
    analysisRequest: {
      findFirst: mockFindFirst,
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      count: mockCount,
      aggregate: mockAggregate,
    },
    userAnalysisCounter: {
      upsert: mockCounterUpsert,
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        userAnalysisCounter: { upsert: mockCounterUpsert },
        analysisRequest: { create: mockCreate },
      };
      return fn(tx);
    }),
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
      mockCounterUpsert.mockResolvedValue({
        userId: "user-test-1",
        counter: 1,
      });
      mockCreate.mockResolvedValue({
        id: "req-001",
        publicId: 1,
        status: "PENDING",
        chain: "ethereum",
        address: "0xabc",
        userId: "user-test-1",
        requestedAt: new Date(),
      });

      const res = await app.inject({
        method: "POST",
        url: "/analysis",
        headers: { authorization: `Bearer ${signToken("user-test-1")}` },
        payload: { chain: "ethereum", address: "0xabc" },
      });

      expect(res.statusCode).toBe(202);
      expect(res.json()).toMatchObject({
        requestId: "req-001",
        status: "pending",
      });
      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "req-001",
          userId: "user-test-1",
          chain: "ethereum",
          address: "0xabc",
        })
      );

      await app.close();
    });

    it("deve retornar 401 sem token de autenticação", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      const res = await app.inject({
        method: "POST",
        url: "/analysis",
        payload: { chain: "ethereum", address: "0xabc" },
      });

      expect(res.statusCode).toBe(401);

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
        headers: { authorization: `Bearer ${signToken()}` },
        payload: { chain: "ethereum", address: "0xabc" },
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
        headers: { authorization: `Bearer ${signToken()}` },
        payload: { chain: "ethereum", address: "0xabc" },
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
        headers: { authorization: `Bearer ${signToken()}` },
        payload: { chain: "ethereum" }, // faltando address
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: "Invalid body" });

      await app.close();
    });
  });

  describe("GET /analysis", () => {
    it("deve retornar 401 sem token de autenticação", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      const res = await app.inject({ method: "GET", url: "/analysis" });

      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it("deve retornar summary, data e pagination para usuário autenticado", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindMany.mockResolvedValue([
        {
          id: "req-001",
          chain: "ethereum",
          address: "0xabc",
          score: 85,
          requestedAt: new Date("2026-04-13T10:00:00Z"),
          completedAt: new Date("2026-04-13T10:01:00Z"),
          userId: "user-test-1",
          status: "COMPLETED",
          confidence: 0.9,
          reasoning: null,
          positiveFactors: [],
          riskFactors: [],
          modelVersion: null,
          promptVersion: null,
          failedAt: null,
          failureReason: null,
        },
      ]);
      // listByUserId: count(total=1)
      // summarizeByUserId: count(total=1), aggregate, count(trusted=1), count(attention=0), count(risky=0)
      mockCount
        .mockResolvedValueOnce(1) // listByUserId total
        .mockResolvedValueOnce(1) // summarizeByUserId total
        .mockResolvedValueOnce(1) // trusted
        .mockResolvedValueOnce(0) // attention
        .mockResolvedValueOnce(0); // risky
      mockAggregate.mockResolvedValue({
        _avg: { score: 85 },
        _count: { _all: 1 },
      });

      const res = await app.inject({
        method: "GET",
        url: "/analysis",
        headers: { authorization: `Bearer ${signToken()}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty("summary");
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("pagination");
      expect(body.data).toHaveLength(1);
      expect(body.data[0].score).toBe(85);
      expect(body.pagination.page).toBe(1);

      await app.close();
    });
  });

  describe("GET /analysis/:id", () => {
    it("deve retornar 401 sem token de autenticação", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      const res = await app.inject({
        method: "GET",
        url: "/analysis/req-001",
      });

      expect(res.statusCode).toBe(401);

      await app.close();
    });

    it("deve retornar 404 quando request não existe", async () => {
      const { createHttpServer } = await import("./server.js");
      const app = await createHttpServer();

      mockFindUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: "GET",
        url: "/analysis/req-nao-existe",
        headers: { authorization: `Bearer ${signToken()}` },
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

      const res = await app.inject({
        method: "GET",
        url: "/analysis/req-001",
        headers: { authorization: `Bearer ${signToken()}` },
      });
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

      const res = await app.inject({
        method: "GET",
        url: "/analysis/req-001",
        headers: { authorization: `Bearer ${signToken()}` },
      });
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

      const res = await app.inject({
        method: "GET",
        url: "/analysis/req-001",
        headers: { authorization: `Bearer ${signToken()}` },
      });
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
