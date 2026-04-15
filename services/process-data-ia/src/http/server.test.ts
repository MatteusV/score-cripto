import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── mocks ──────────────────────────────────────────────────────────────────────
const mockCheckRabbitMQHealth = vi.fn();
const mockQueryRaw = vi.fn();

vi.mock("../events/publisher.js", () => ({
  checkRabbitMQHealth: mockCheckRabbitMQHealth,
}));

vi.mock("../services/database.js", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// ── helpers ────────────────────────────────────────────────────────────────────
function getJson(port: number): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}/health`, (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
        });
      })
      .on("error", reject);
  });
}

let currentPort = 29100;
function nextPort() {
  return currentPort++;
}

describe("process-data-ia health server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /health", () => {
    it("retorna 200 quando RabbitMQ e PostgreSQL estão acessíveis", async () => {
      mockCheckRabbitMQHealth.mockResolvedValue(true);
      mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const { createHealthServer } = await import("./server.js");
      const port = nextPort();
      const srv = createHealthServer(port);
      await new Promise<void>((r) => srv.once("listening", r));

      const { status, body } = await getJson(port);
      srv.close();

      expect(status).toBe(200);
      expect(body).toMatchObject({
        status: "ok",
        checks: { rabbitmq: "up", postgres: "up" },
      });
    });

    it("retorna 503 quando RabbitMQ está indisponível", async () => {
      mockCheckRabbitMQHealth.mockResolvedValue(false);
      mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);

      const { createHealthServer } = await import("./server.js");
      const port = nextPort();
      const srv = createHealthServer(port);
      await new Promise<void>((r) => srv.once("listening", r));

      const { status, body } = await getJson(port);
      srv.close();

      expect(status).toBe(503);
      expect(body).toMatchObject({
        status: "degraded",
        checks: { rabbitmq: "down", postgres: "up" },
      });
    });

    it("retorna 503 quando PostgreSQL está indisponível", async () => {
      mockCheckRabbitMQHealth.mockResolvedValue(true);
      mockQueryRaw.mockRejectedValue(new Error("connection refused"));

      const { createHealthServer } = await import("./server.js");
      const port = nextPort();
      const srv = createHealthServer(port);
      await new Promise<void>((r) => srv.once("listening", r));

      const { status, body } = await getJson(port);
      srv.close();

      expect(status).toBe(503);
      expect(body).toMatchObject({
        status: "degraded",
        checks: { rabbitmq: "up", postgres: "down" },
      });
    });
  });
});
