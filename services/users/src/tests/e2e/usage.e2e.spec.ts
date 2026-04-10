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
    it("deve retornar uso inicial com 5 remaining para FREE_TIER", async () => {
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

    it("deve retornar 404 para userId inexistente", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/usage/user-nao-existe",
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /usage/check", () => {
    it("deve retornar 200 com allowed=true quando dentro do limite", async () => {
      const userId = await registerAndGetUserId(app, "check-ok@example.com");

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        payload: { userId },
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as { allowed: boolean }).allowed).toBe(true);
    });

    it("deve retornar 429 quando limite atingido", async () => {
      const userId = await registerAndGetUserId(app, "check-limit@example.com");

      // Consome todas as 5 análises
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
    it("deve decrementar remaining após consumo", async () => {
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

    it("deve retornar 429 ao exceder limite de 5 análises", async () => {
      const userId = await registerAndGetUserId(
        app,
        "consume-limit@example.com"
      );

      // Consome 5 (limite FREE_TIER)
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/usage/consume",
          payload: { userId, analysisId: `analysis-${i}` },
        });
        expect(res.statusCode).toBe(200);
      }

      // 6ª deve ser bloqueada
      const res = await app.inject({
        method: "POST",
        url: "/usage/consume",
        payload: { userId, analysisId: "analysis-over" },
      });

      expect(res.statusCode).toBe(429);
    });

    it("deve persistir contagem no banco de dados", async () => {
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
