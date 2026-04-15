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
      "RabbitMQ publisher failed to connect — events will not be published"
    );
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

export async function checkRabbitMQHealth(): Promise<boolean> {
  if (!channel) {
    return false;
  }
  try {
    await channel.checkExchange(EXCHANGE_NAME);
    return true;
  } catch {
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
    // ignore disconnect errors
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
