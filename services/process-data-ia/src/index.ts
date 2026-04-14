import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { logger } from "./logger.js";

async function start(): Promise<void> {
  try {
    await connectRabbitMQ();
    await startConsumer();

    logger.info("Worker started — consuming events only");
  } catch (error) {
    logger.error({ err: error }, "Failed to start process-data-ia worker");
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info("Shutting down process-data-ia worker");
  await stopConsumer();
  await disconnectRabbitMQ();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
