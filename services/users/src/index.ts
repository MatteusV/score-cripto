import "dotenv/config";
import { config } from "./config.js";
import { startConsumer, stopConsumer } from "./events/consumer.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { createHttpServer } from "./http/server.js";

let app: Awaited<ReturnType<typeof createHttpServer>>;

async function start(): Promise<void> {
  try {
    app = await createHttpServer();

    await connectRabbitMQ();
    await startConsumer();

    await app.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[users] HTTP server listening on port ${config.port}`);
    console.log(
      `[users] Swagger UI disponível em http://localhost:${config.port}/docs`
    );
  } catch (error) {
    console.error("[users] Failed to start:", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("[users] Shutting down...");
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
