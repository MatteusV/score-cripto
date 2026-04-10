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
    console.log("[users][RabbitMQ] Publisher connected and exchange asserted");

    connection.on("close", () => {
      console.log("[users][RabbitMQ] Publisher connection closed");
      connection = null;
      channel = null;
    });
    connection.on("error", (err) => {
      console.error(
        "[users][RabbitMQ] Publisher connection error:",
        err.message
      );
    });
  } catch (error) {
    console.warn(
      "[users][RabbitMQ] Publisher failed to connect:",
      (error as Error).message
    );
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
    /* ignore close errors */
  } finally {
    channel = null;
    connection = null;
  }
}

function publishEvent(routingKey: string, payload: unknown): boolean {
  if (!channel) {
    console.warn(
      `[users][RabbitMQ] No channel available, skipping: ${routingKey}`
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
    console.log(`[users] EMITINDO: ${routingKey}`);
    return true;
  } catch (error) {
    console.error(
      `[users][RabbitMQ] Failed to publish ${routingKey}:`,
      (error as Error).message
    );
    return false;
  }
}

// TODO: add typed publish functions for user service events
// e.g., publishUserAnalysisConsumed, publishUserCreated, etc.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _publishUserEvent<T>(eventType: string, data: T): boolean {
  return publishEvent(`user.${eventType}`, {
    event: `user.${eventType}`,
    schemaVersion: "1.0.0",
    timestamp: new Date().toISOString(),
    data,
  });
}
