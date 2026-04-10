import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── mocks ──────────────────────────────────────────────────────────────────────
const mockUser = vi.fn();
const mockSubscription = vi.fn();
const mockUsageRecord = vi.fn();
const mockRefreshToken = vi.fn();

vi.mock("../services/database.js", () => ({
  prisma: {
    user: {
      findUnique: mockUser,
      create: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      findUnique: mockSubscription,
    },
    usageRecord: {
      create: vi.fn(),
      findUnique: mockUsageRecord,
      update: vi.fn(),
    },
    refreshToken: {
      create: mockRefreshToken,
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// ── helpers ────────────────────────────────────────────────────────────────────
async function getApp() {
  const { createHttpServer } = await import("./server.js");
  return createHttpServer();
}

describe("Users HTTP server (Fastify)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // ── GET /health ──────────────────────────────────────────────────────────────
  describe("GET /health", () => {
    it("deve retornar status ok", async () => {
      const app = await getApp();
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: "ok" });
      await app.close();
    });
  });

  // ── POST /auth/register ──────────────────────────────────────────────────────
  describe("POST /auth/register", () => {
    it("deve registrar usuário e retornar 201", async () => {
      const app = await getApp();

      // findByEmail → null (não existe), create → usuário novo
      mockUser.mockResolvedValueOnce(null);
      const { prisma } = await import("../services/database.js");
      vi.mocked(prisma.user.create).mockResolvedValueOnce({
        id: "u-1",
        email: "alice@example.com",
        name: null,
        passwordHash: "hash",
        role: "USER",
        stripeCustomerId: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      } as never);
      vi.mocked(prisma.subscription.create).mockResolvedValueOnce({} as never);
      vi.mocked(prisma.usageRecord.create).mockResolvedValueOnce({} as never);

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "alice@example.com", password: "senha1234" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        id: "u-1",
        email: "alice@example.com",
      });
      await app.close();
    });

    it("deve retornar 409 quando email já existe", async () => {
      const app = await getApp();

      mockUser.mockResolvedValueOnce({
        id: "u-existing",
        email: "dup@example.com",
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "dup@example.com", password: "senha1234" },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ error: "Email already in use" });
      await app.close();
    });

    it("deve retornar 400 para body inválido", async () => {
      const app = await getApp();

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "nao-e-email", password: "curta" },
      });

      expect(res.statusCode).toBe(400);
      await app.close();
    });
  });

  // ── POST /auth/login ─────────────────────────────────────────────────────────
  describe("POST /auth/login", () => {
    it("deve retornar 200 com tokens para credenciais válidas", async () => {
      const app = await getApp();
      const passwordHash = await bcrypt.hash("senha1234", 10);

      mockUser.mockResolvedValueOnce({
        id: "u-1",
        email: "alice@example.com",
        name: null,
        role: "USER",
        passwordHash,
        stripeCustomerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRefreshToken.mockResolvedValueOnce({ id: "rt-1" });

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "alice@example.com", password: "senha1234" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.email).toBe("alice@example.com");
      await app.close();
    });

    it("deve retornar 401 para credenciais inválidas", async () => {
      const app = await getApp();

      mockUser.mockResolvedValueOnce(null);

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "nao@existe.com", password: "senha1234" },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: "Invalid credentials" });
      await app.close();
    });
  });

  // ── POST /usage/check ────────────────────────────────────────────────────────
  describe("POST /usage/check", () => {
    it("deve retornar 200 quando usuário tem limite disponível", async () => {
      const app = await getApp();
      const now = new Date();

      // findById (user lookup)
      mockUser.mockResolvedValueOnce({ id: "u-1" });
      // findByUserId (subscription)
      mockSubscription.mockResolvedValueOnce({ plan: "FREE_TIER" });
      // findByUserAndPeriod (usage)
      mockUsageRecord.mockResolvedValueOnce({
        id: "ur-1",
        analysisCount: 2,
        resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      });

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        payload: { userId: "u-1" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.allowed).toBe(true);
      expect(body.remaining).toBe(3);
      expect(body.limit).toBe(5);
      await app.close();
    });

    it("deve retornar 429 quando usuário atingiu o limite", async () => {
      const app = await getApp();
      const now = new Date();

      mockUser.mockResolvedValueOnce({ id: "u-1" });
      mockSubscription.mockResolvedValueOnce({ plan: "FREE_TIER" });
      mockUsageRecord.mockResolvedValueOnce({
        id: "ur-1",
        analysisCount: 5,
        resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      });

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        payload: { userId: "u-1" },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json()).toMatchObject({
        error: "Monthly analysis limit reached",
      });
      await app.close();
    });

    it("deve retornar 404 para userId inexistente", async () => {
      const app = await getApp();

      mockUser.mockResolvedValueOnce(null);

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        payload: { userId: "nao-existe" },
      });

      expect(res.statusCode).toBe(404);
      await app.close();
    });
  });
});
