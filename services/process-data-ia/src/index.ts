import { config } from "./config.js";
import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { createHttpServer } from "./http/server.js";

const httpServer = createHttpServer();

async function start(): Promise<void> {
  try {
    await connectRabbitMQ();
    await startConsumer();

    httpServer.listen(config.port, () => {
      console.log(
        `[process-data-ia] HTTP server listening on port ${config.port}`
      );
    });

    console.log("[process-data-ia] Consumer started");
  } catch (error) {
    console.error("[process-data-ia] Failed to start:", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("[process-data-ia] Shutting down...");
  await stopConsumer();
  await disconnectRabbitMQ();
  httpServer.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
