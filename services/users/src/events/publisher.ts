import {
  getCorrelationId,
  publishWithCorrelation,
} from "@score-cripto/observability-node";
import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { config } from "../config.js";
import { logger } from "../logger.js";

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
    logger.info("RabbitMQ publisher connected and exchange asserted");

    connection.on("close", () => {
      logger.warn("RabbitMQ publisher connection closed");
      connection = null;
      channel = null;
    });
    connection.on("error", (err) => {
      logger.error({ err: err.message }, "RabbitMQ publisher connection error");
    });
  } catch (error) {
    logger.warn(
      { err: (error as Error).message },
      "RabbitMQ publisher failed to connect"
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
    // ignore disconnect errors
  } finally {
    channel = null;
    connection = null;
  }
}

function publishEvent(routingKey: string, payload: unknown): boolean {
  if (!channel) {
    logger.warn({ routingKey }, "No AMQP channel available, skipping event");
    return false;
  }

  const correlationId = getCorrelationId() ?? crypto.randomUUID();

  try {
    const message = Buffer.from(JSON.stringify(payload));
    publishWithCorrelation(
      channel,
      EXCHANGE_NAME,
      routingKey,
      message,
      {
        persistent: true,
        contentType: "application/json",
        timestamp: Date.now(),
      },
      correlationId
    );
    logger.info({ routingKey, correlationId }, "Event published");
    return true;
  } catch (error) {
    logger.error(
      { routingKey, correlationId, err: (error as Error).message },
      "Failed to publish event"
    );
    return false;
  }
}

function _publishUserEvent<T>(eventType: string, data: T): boolean {
  return publishEvent(`user.${eventType}`, {
    event: `user.${eventType}`,
    schemaVersion: "1.0.0",
    timestamp: new Date().toISOString(),
    data,
  });
}
