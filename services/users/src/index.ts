import "dotenv/config";
import { config } from "./config.js";
import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { createHttpServer } from "./http/server.js";
import { logger } from "./logger.js";

let app: Awaited<ReturnType<typeof createHttpServer>>;

async function start(): Promise<void> {
  try {
    app = await createHttpServer();

    await connectRabbitMQ();
    await startConsumer();

    await app.listen({ port: config.port, host: "0.0.0.0" });
    logger.info({ port: config.port }, "HTTP server listening");
    logger.info({ url: `http://localhost:${config.port}/docs` }, "Swagger UI available");
  } catch (error) {
    logger.error({ err: error }, "Failed to start users service");
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info("Shutting down users service");
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
