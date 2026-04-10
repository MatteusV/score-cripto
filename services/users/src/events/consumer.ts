import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { config } from "../config.js";
import {
  processUserAnalysisConsumedMessage,
  QUEUE_NAME,
  ROUTING_KEY,
} from "./user-analysis-consumer.js";

const EXCHANGE_NAME = "score-cripto.events";
const EXCHANGE_TYPE = "topic";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function startConsumer(): Promise<void> {
  try {
    connection = await amqplib.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
      durable: true,
    });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    channel.prefetch(1);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) {
        return;
      }

      const result = await processUserAnalysisConsumedMessage(
        msg.content.toString()
      );

      if (result.outcome === "invalid_payload") {
        channel?.nack(msg, false, false); // dead-letter
      } else if (result.outcome === "error") {
        channel?.nack(msg, false, true); // retry
      } else {
        channel?.ack(msg); // processed ou limit_exceeded
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
