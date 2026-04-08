import { config } from "./config.js";
import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { createHttpServer } from "./http/server.js";

const app = createHttpServer();

async function start(): Promise<void> {
  try {
    await connectRabbitMQ();
    await startConsumer();

    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[api-gateway] HTTP server listening on port ${config.port}`);
  } catch (error) {
    console.error("[api-gateway] Failed to start:", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("[api-gateway] Shutting down...");
  await app.close();
  await stopConsumer();
  await disconnectRabbitMQ();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
