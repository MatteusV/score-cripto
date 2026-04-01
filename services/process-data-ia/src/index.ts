import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";

async function start(): Promise<void> {
  try {
    await connectRabbitMQ();
    await startConsumer();
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
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
