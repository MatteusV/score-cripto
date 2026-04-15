import { config } from "./config.js";
import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { createHttpServer } from "./http/server.js";
import { startExpireJob } from "./jobs/expire-stale-analyses.js";
import { logger } from "./logger.js";
import { AnalysisRequestPrismaRepository } from "./repositories/prisma/analysis-request-prisma-repository.js";
import { prisma } from "./services/database.js";

let app: Awaited<ReturnType<typeof createHttpServer>>;
let expireJobTimer: NodeJS.Timeout;

async function start(): Promise<void> {
  try {
    app = await createHttpServer();

    await connectRabbitMQ();
    await startConsumer();

    const repository = new AnalysisRequestPrismaRepository(prisma);
    expireJobTimer = startExpireJob(
      repository,
      config.staleAnalysisThresholdMs,
      config.reconcileIntervalMs
    );
    logger.info(
      {
        thresholdMs: config.staleAnalysisThresholdMs,
        intervalMs: config.reconcileIntervalMs,
      },
      "Expire-stale-analyses job started"
    );

    await app.listen({ port: config.port, host: "0.0.0.0" });
    logger.info({ port: config.port }, "HTTP server listening");
    logger.info(
      { url: `http://localhost:${config.port}/docs` },
      "Swagger UI available"
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to start api-gateway");
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info("Shutting down api-gateway");
  clearInterval(expireJobTimer);
  if (app) {
    await app.close();
  }
  await stopConsumer();
  await disconnectRabbitMQ();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
