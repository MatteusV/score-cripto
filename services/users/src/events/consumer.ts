import amqplib, {
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from "amqplib";
import { config } from "../config.js";
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

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) {
        return;
      }

      try {
        const result = await processUserAnalysisConsumedMessage(
          msg.content.toString()
        );

        if (result.outcome === "invalid_payload") {
          channel?.nack(msg, false, false); // payload inválido → DLQ direto
        } else if (result.outcome === "error") {
          if (channel) {
            retryOrDeadLetter(channel, msg);
          }
        } else {
          channel?.ack(msg); // processed ou limit_exceeded
        }
      } catch (error) {
        console.error(
          "[users][Consumer] Failed to process event (transient):",
          (error as Error).message
        );
        if (channel) {
          retryOrDeadLetter(channel, msg);
        }
      }
    });

    connection.on("close", () => {
      console.log("[users][Consumer] Connection closed");
      connection = null;
      channel = null;
    });

    connection.on("error", (err) => {
      console.error("[users][Consumer] Connection error:", err.message);
    });

    console.log(`[users][Consumer] Listening on queue: ${QUEUE_NAME}`);
  } catch (error) {
    console.warn(
      "[users][Consumer] Failed to connect, events will not be consumed:",
      (error as Error).message
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
    /* ignore close errors */
  } finally {
    channel = null;
    connection = null;
  }
}
