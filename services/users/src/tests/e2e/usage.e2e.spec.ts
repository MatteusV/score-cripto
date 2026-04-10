import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHttpServer } from "../../http/server";
import type { E2EDatabase } from "./helpers/e2e-database";
import { createE2EDatabase } from "./helpers/e2e-database";

async function registerAndGetUserId(
  // biome-ignore lint/suspicious/noExplicitAny: fastify instance type in e2e context
  app: any,
  email: string
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "senha1234" },
  });
  return (res.json() as { id: string }).id;
}

describe("Usage E2E — check, consume e limites mensais", () => {
  let db: E2EDatabase;
  // biome-ignore lint/suspicious/noExplicitAny: fastify instance type in e2e context
  let app: any;

  beforeAll(async () => {
    db = createE2EDatabase();
    await db.connect();
    app = await createHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await db.disconnect();
  });

  beforeEach(async () => {
    await db.cleanup();
  });

  describe("GET /usage/:userId", () => {
    it("should return initial usage with 5 remaining for FREE_TIER", async () => {
      const userId = await registerAndGetUserId(app, "usage-get@example.com");

      const res = await app.inject({
        method: "GET",
        url: `/usage/${userId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        allowed: boolean;
        remaining: number;
        limit: number;
      };
      expect(body.allowed).toBe(true);
      expect(body.remaining).toBe(5);
      expect(body.limit).toBe(5);
    });

    it("should return 404 for non-existent userId", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/usage/user-nao-existe",
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /usage/check", () => {
    it("should return 200 with allowed=true when within limit", async () => {
      const userId = await registerAndGetUserId(app, "check-ok@example.com");

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        payload: { userId },
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as { allowed: boolean }).allowed).toBe(true);
    });

    it("should return 429 when limit reached", async () => {
      const userId = await registerAndGetUserId(app, "check-limit@example.com");

      // Consume all 5 analyses
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "POST",
          url: "/usage/consume",
          payload: { userId, analysisId: `analysis-${i}` },
        });
      }

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        payload: { userId },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json()).toMatchObject({
        error: "Monthly analysis limit reached",
      });
    });
  });

  describe("POST /usage/consume", () => {
    it("should decrement remaining after consumption", async () => {
      const userId = await registerAndGetUserId(app, "consume-dec@example.com");

      const before = await app.inject({
        method: "GET",
        url: `/usage/${userId}`,
      });
      const beforeRemaining = (before.json() as { remaining: number })
        .remaining;

      await app.inject({
        method: "POST",
        url: "/usage/consume",
        payload: { userId, analysisId: "analysis-1" },
      });

      const after = await app.inject({
        method: "GET",
        url: `/usage/${userId}`,
      });
      const afterRemaining = (after.json() as { remaining: number }).remaining;

      expect(afterRemaining).toBe(beforeRemaining - 1);
    });

    it("should return 429 when exceeding limit of 5 analyses", async () => {
      const userId = await registerAndGetUserId(
        app,
        "consume-limit@example.com"
      );

      // Consume 5 (FREE_TIER limit)
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/usage/consume",
          payload: { userId, analysisId: `analysis-${i}` },
        });
        expect(res.statusCode).toBe(200);
      }

      // 6th should be blocked
      const res = await app.inject({
        method: "POST",
        url: "/usage/consume",
        payload: { userId, analysisId: "analysis-over" },
      });

      expect(res.statusCode).toBe(429);
    });

    it("should persist count in the database", async () => {
      const userId = await registerAndGetUserId(app, "consume-db@example.com");

      await app.inject({
        method: "POST",
        url: "/usage/consume",
        payload: { userId, analysisId: "analysis-1" },
      });
      await app.inject({
        method: "POST",
        url: "/usage/consume",
        payload: { userId, analysisId: "analysis-2" },
      });

      const rows = await db.query(
        `SELECT "analysisCount" FROM "${db.getSchema()}"."usage_records" WHERE "userId" = '${userId}'`
      );
      expect(rows.rowCount).toBe(1);
      expect(Number(rows.rows[0].analysisCount)).toBe(2);
    });
  });
});
