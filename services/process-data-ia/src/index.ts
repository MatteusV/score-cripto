import type { Server } from "node:http";
import { config } from "./config.js";
import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { createHealthServer } from "./http/server.js";
import { logger } from "./logger.js";

let healthServer: Server | undefined;

async function start(): Promise<void> {
  try {
    await connectRabbitMQ();
    await startConsumer();

    healthServer = createHealthServer(config.healthPort);

    logger.info(
      { port: config.healthPort },
      "Worker started — consuming events, health check available"
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to start process-data-ia worker");
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info("Shutting down process-data-ia worker");
  await new Promise<void>((resolve) => {
    healthServer?.close(() => resolve());
    if (!healthServer) resolve();
  });
  await stopConsumer();
  await disconnectRabbitMQ();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
