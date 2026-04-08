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
    console.log("[api-gateway][RabbitMQ] Connected and exchange asserted");

    connection.on("close", () => {
      console.log("[api-gateway][RabbitMQ] Connection closed");
      connection = null;
      channel = null;
    });

    connection.on("error", (err) => {
      console.error("[api-gateway][RabbitMQ] Connection error:", err.message);
    });
  } catch (error) {
    console.warn(
      "[api-gateway][RabbitMQ] Failed to connect, events will not be published:",
      (error as Error).message
    );
  }
}

export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    // ignore close errors
  } finally {
    channel = null;
    connection = null;
  }
}

function publishEvent(routingKey: string, payload: unknown): boolean {
  if (!channel) {
    console.warn(
      `[api-gateway][RabbitMQ] No channel available, skipping: ${routingKey}`
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
      `[api-gateway][RabbitMQ] Failed to publish ${routingKey}:`,
      (error as Error).message
    );
    return false;
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
