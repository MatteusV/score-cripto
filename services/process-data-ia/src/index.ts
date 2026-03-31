import Fastify from "fastify";
import { config } from "./config.js";
import { connectRabbitMQ, disconnectRabbitMQ } from "./events/publisher.js";
import { scoreRoutes } from "./routes/score.js";

const fastify = Fastify({
  logger: true,
});

// Health check
fastify.get("/health", async () => {
  return {
    status: "ok",
    service: "process-data-ia",
    timestamp: new Date().toISOString(),
  };
});

// Register routes
fastify.register(scoreRoutes);

async function start(): Promise<void> {
  try {
    // Connect to RabbitMQ (non-blocking, will warn if unavailable)
    await connectRabbitMQ();

    await fastify.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`[process-data-ia] Server running on port ${config.port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log("[process-data-ia] Shutting down...");
  await fastify.close();
  await disconnectRabbitMQ();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();

export { fastify };
