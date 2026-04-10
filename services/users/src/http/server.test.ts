import { describe, expect, it } from "vitest";

describe("Users HTTP server (Fastify)", () => {
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
