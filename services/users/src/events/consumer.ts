import { withCorrelation } from "@score-cripto/observability-node";
import amqplib, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from "amqplib";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { assertDlqForQueue, dlqArgumentsFor } from "./dlq-topology.js";
import { assertRetryQueueFor, scheduleRetry } from "./retry-topology.js";
import {
  processUserAnalysisConsumedMessage,
  QUEUE_NAME,
  ROUTING_KEY,
} from "./user-analysis-consumer.js";

const EXCHANGE_NAME = "score-cripto.events";
const EXCHANGE_TYPE = "topic";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

function retryOrDeadLetter(ch: Channel, msg: ConsumeMessage): void {
  const scheduled = scheduleRetry(ch, msg, QUEUE_NAME);
  if (scheduled) {
    ch.ack(msg);
  } else {
    ch.nack(msg, false, false);
  }
}

export async function startConsumer(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true,
    });
    await assertDlqForQueue(channel, QUEUE_NAME);
    await assertRetryQueueFor(channel, QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: dlqArgumentsFor(QUEUE_NAME),
    });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    channel.prefetch(1);

    channel.consume(QUEUE_NAME, (msg) => {
      if (!msg) {
        return;
      }
      withCorrelation(msg, async (correlationId) => {
        try {
          const result = await processUserAnalysisConsumedMessage(
            msg.content.toString(),
            correlationId
          );

          if (result.outcome === "invalid_payload") {
            channel?.nack(msg, false, false);
          } else if (result.outcome === "error") {
            if (channel) {
              retryOrDeadLetter(channel, msg);
            }
          } else {
            channel?.ack(msg);
          }
        } catch (error) {
          logger.error(
            { correlationId, err: (error as Error).message },
            "Failed to process event (transient)"
          );
          if (channel) {
            retryOrDeadLetter(channel, msg);
          }
        }
      });
    });

    connection.on("close", () => {
      logger.warn("RabbitMQ consumer connection closed");
      connection = null;
      channel = null;
    });

    connection.on("error", (err) => {
      logger.error({ err: err.message }, "RabbitMQ consumer connection error");
    });

    logger.info({ queue: QUEUE_NAME }, "Consumer started");
  } catch (error) {
    logger.warn(
      { err: (error as Error).message },
      "RabbitMQ consumer failed to connect"
    );
  }
}

export async function stopConsumer(): Promise<void> {
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
