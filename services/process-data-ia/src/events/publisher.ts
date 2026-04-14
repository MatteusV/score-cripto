import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { config } from "../config.js";

const EXCHANGE_NAME = "score-cripto.events";
const EXCHANGE_TYPE = "topic";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true,
    });
    console.log("[RabbitMQ] Connected and exchange asserted");

    connection.on("close", () => {
      console.log("[RabbitMQ] Connection closed");
      connection = null;
      channel = null;
    });

    connection.on("error", (err) => {
      console.error("[RabbitMQ] Connection error:", err.message);
    });
  } catch (error) {
    console.warn(
      "[RabbitMQ] Failed to connect, events will not be published:",
      (error as Error).message
    );
  }
}

export function publishEvent(routingKey: string, payload: unknown): boolean {
  if (!channel) {
    console.warn(
      `[RabbitMQ] No channel available, skipping event: ${routingKey}`
    );
    return false;
  }

  try {
    const message = Buffer.from(JSON.stringify(payload));
    channel.publish(EXCHANGE_NAME, routingKey, message, {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
    });
    console.log(`EMITINDO: ${routingKey}`);
    return true;
  } catch (error) {
    console.error(
      `[RabbitMQ] Failed to publish event ${routingKey}:`,
      (error as Error).message
    );
    return false;
  }
}

export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
  } catch {
    // Ignore close errors
  } finally {
    channel = null;
    connection = null;
  }
}

export function publishWalletDataRequested(data: {
  requestId: string;
  userId: string;
  chain: string;
  address: string;
}): boolean {
  return publishEvent("wallet.data.requested", {
    event: "wallet.data.requested",
    schemaVersion: "1",
    timestamp: new Date().toISOString(),
    data,
  });
}

export function publishScoreCalculated(data: {
  processId: string;
  chain: string;
  address: string;
  score: number;
  confidence: number;
  reasoning: string;
  positiveFactors: string[];
  riskFactors: string[];
  modelVersion: string;
  promptVersion: string;
}): boolean {
  return publishEvent("wallet.score.calculated", {
    event: "wallet.score.calculated",
    timestamp: new Date().toISOString(),
    data,
  });
}

export function publishScoreFailed(data: {
  requestId: string;
  reason: string;
}): boolean {
  return publishEvent("wallet.score.failed", {
    event: "wallet.score.failed",
    timestamp: new Date().toISOString(),
    data,
  });
}
