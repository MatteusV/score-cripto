import http, { type Server } from "node:http";
import { checkRabbitMQHealth } from "../events/publisher.js";
import { logger } from "../logger.js";
import { prisma } from "../services/database.js";

interface HealthChecks {
  postgres: "up" | "down";
  rabbitmq: "up" | "down";
}

async function runChecks(): Promise<HealthChecks> {
  const [rabbitResult, postgresResult] = await Promise.allSettled([
    checkRabbitMQHealth().then((ok) => {
      if (!ok) {
        throw new Error("rabbitmq not connected");
      }
    }),
    prisma.$queryRaw`SELECT 1`,
  ]);

  return {
    rabbitmq: rabbitResult.status === "fulfilled" ? "up" : "down",
    postgres: postgresResult.status === "fulfilled" ? "up" : "down",
  };
}

export function createHealthServer(port: number): Server {
  const server = http.createServer(async (_req, res) => {
    try {
      const checks = await runChecks();
      const allUp = checks.rabbitmq === "up" && checks.postgres === "up";

      const body = JSON.stringify({
        status: allUp ? "ok" : "degraded",
        checks,
      });

      res.writeHead(allUp ? 200 : 503, { "Content-Type": "application/json" });
      res.end(body);
    } catch (error) {
      logger.error({ err: error }, "health check failed unexpectedly");
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "degraded",
          checks: { rabbitmq: "down", postgres: "down" },
        })
      );
    }
  });

  server.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Health server listening");
  });

  return server;
}
