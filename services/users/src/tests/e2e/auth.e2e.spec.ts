import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createHttpServer } from "../../http/server.js";
import type { E2EDatabase } from "./helpers/e2e-database.js";
import { createE2EDatabase } from "./helpers/e2e-database.js";

describe("Auth E2E — register, login, refresh", () => {
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

  describe("POST /auth/register", () => {
    it("should register new user and return 201", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "user@example.com",
          password: "senha1234",
          name: "Test User",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json() as { id: string; email: string; name: string };
      expect(body.email).toBe("user@example.com");
      expect(body.name).toBe("Test User");
      expect(body.id).toBeTruthy();
    });

    it("should create FREE_TIER subscription when registering", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "user@example.com", password: "senha1234" },
      });

      const rows = await db.query(
        `SELECT * FROM "${db.getSchema()}"."subscriptions"`
      );
      expect(rows.rowCount).toBe(1);
      expect(rows.rows[0].plan).toBe("FREE_TIER");
      expect(rows.rows[0].status).toBe("active");
    });

    it("should return 409 when registering duplicate email", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "dup@example.com", password: "senha1234" },
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "dup@example.com", password: "senha1234" },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ error: "Email already in use" });
    });
  });

  describe("POST /auth/login", () => {
    it("should authenticate and return tokens", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "login@example.com", password: "senha1234" },
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "login@example.com", password: "senha1234" },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        accessToken: string;
        refreshToken: string;
        user: { email: string };
      };
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
      expect(body.user.email).toBe("login@example.com");
    });

    it("should return 401 with wrong password", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "creds@example.com", password: "senha1234" },
      });

      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "creds@example.com", password: "wrong-password" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("should renew tokens with valid refresh token", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "refresh@example.com", password: "senha1234" },
      });

      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "refresh@example.com", password: "senha1234" },
      });
      const { refreshToken } = loginRes.json() as { refreshToken: string };

      const refreshRes = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });

      expect(refreshRes.statusCode).toBe(200);
      const body = refreshRes.json() as {
        accessToken: string;
        refreshToken: string;
      };
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
      expect(body.refreshToken).not.toBe(refreshToken);
    });

    it("should return 401 when reusing revoked refresh token", async () => {
      await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "rotation@example.com", password: "senha1234" },
      });

      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "rotation@example.com", password: "senha1234" },
      });
      const { refreshToken } = loginRes.json() as { refreshToken: string };

      // Primeiro refresh — revoga o token original
      await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });

      // Segundo refresh com o token original (revogado)
      const res = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
