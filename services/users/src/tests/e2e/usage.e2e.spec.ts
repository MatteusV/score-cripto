import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHttpServer } from "../../http/server.js";
import type { E2EDatabase } from "./helpers/e2e-database.js";
import { createE2EDatabase } from "./helpers/e2e-database.js";

async function registerAndLogin(
  app: any,
  email: string
): Promise<{ userId: string; authHeader: string }> {
  const reg = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "senha1234" },
  });
  const userId = (reg.json() as { id: string }).id;

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password: "senha1234" },
  });
  const { accessToken } = login.json() as { accessToken: string };

  return { userId, authHeader: `Bearer ${accessToken}` };
}

describe("Usage E2E — check, consume e limites mensais", () => {
  let db: E2EDatabase;
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
      const { userId, authHeader } = await registerAndLogin(
        app,
        "usage-get@example.com"
      );

      const res = await app.inject({
        method: "GET",
        url: `/usage/${userId}`,
        headers: { authorization: authHeader },
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

    it("should return 401 without token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/usage/anything",
      });
      expect(res.statusCode).toBe(401);
    });

    it("should return 404 when querying another user's id (no ownership leak)", async () => {
      const { authHeader } = await registerAndLogin(
        app,
        "usage-viewer@example.com"
      );
      const { userId: targetId } = await registerAndLogin(
        app,
        "usage-target@example.com"
      );

      const res = await app.inject({
        method: "GET",
        url: `/usage/${targetId}`,
        headers: { authorization: authHeader },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /usage/check", () => {
    it("should return 401 without token", async () => {
      const res = await app.inject({ method: "POST", url: "/usage/check" });
      expect(res.statusCode).toBe(401);
    });

    it("should return 200 with allowed=true when within limit", async () => {
      const { authHeader } = await registerAndLogin(
        app,
        "check-ok@example.com"
      );

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        headers: { authorization: authHeader },
      });

      expect(res.statusCode).toBe(200);
      expect((res.json() as { allowed: boolean }).allowed).toBe(true);
    });

    it("should return 429 when limit reached", async () => {
      const { authHeader } = await registerAndLogin(
        app,
        "check-limit@example.com"
      );

      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: "POST",
          url: "/usage/consume",
          headers: { authorization: authHeader },
        });
      }

      const res = await app.inject({
        method: "POST",
        url: "/usage/check",
        headers: { authorization: authHeader },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json()).toMatchObject({
        error: "Monthly analysis limit reached",
      });
    });
  });

  describe("POST /usage/consume", () => {
    it("should return 401 without token", async () => {
      const res = await app.inject({ method: "POST", url: "/usage/consume" });
      expect(res.statusCode).toBe(401);
    });

    it("should decrement remaining after consumption", async () => {
      const { userId, authHeader } = await registerAndLogin(
        app,
        "consume-dec@example.com"
      );

      const before = await app.inject({
        method: "GET",
        url: `/usage/${userId}`,
        headers: { authorization: authHeader },
      });
      const beforeRemaining = (before.json() as { remaining: number })
        .remaining;

      await app.inject({
        method: "POST",
        url: "/usage/consume",
        headers: { authorization: authHeader },
      });

      const after = await app.inject({
        method: "GET",
        url: `/usage/${userId}`,
        headers: { authorization: authHeader },
      });
      const afterRemaining = (after.json() as { remaining: number }).remaining;

      expect(afterRemaining).toBe(beforeRemaining - 1);
    });

    it("should return 429 when exceeding limit of 5 analyses", async () => {
      const { authHeader } = await registerAndLogin(
        app,
        "consume-limit@example.com"
      );

      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/usage/consume",
          headers: { authorization: authHeader },
        });
        expect(res.statusCode).toBe(200);
      }

      const res = await app.inject({
        method: "POST",
        url: "/usage/consume",
        headers: { authorization: authHeader },
      });

      expect(res.statusCode).toBe(429);
    });

    it("should persist count in the database", async () => {
      const { userId, authHeader } = await registerAndLogin(
        app,
        "consume-db@example.com"
      );

      await app.inject({
        method: "POST",
        url: "/usage/consume",
        headers: { authorization: authHeader },
      });
      await app.inject({
        method: "POST",
        url: "/usage/consume",
        headers: { authorization: authHeader },
      });

      const rows = await db.query(
        `SELECT "analysisCount" FROM "${db.getSchema()}"."usage_records" WHERE "userId" = '${userId}'`
      );
      expect(rows.rowCount).toBe(1);
      expect(Number(rows.rows[0].analysisCount)).toBe(2);
    });
  });
});
