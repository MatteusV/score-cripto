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
    console.log("[users][RabbitMQ] Connected and exchange asserted");

    connection.on("close", () => {
      console.log("[users][RabbitMQ] Connection closed");
      connection = null;
      channel = null;
    });
    connection.on("error", (err) => {
      console.error("[users][RabbitMQ] Connection error:", err.message);
    });
  } catch (error) {
    console.warn(
      "[users][RabbitMQ] Failed to connect, events will not be consumed:",
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

export async function startConsumer(): Promise<void> {
  // TODO: implement queue bindings and message handlers
  // for user.analysis.consumed and other events
  console.log("[users][RabbitMQ] Consumer stub — no queues bound yet");
}

export async function stopConsumer(): Promise<void> {
  // TODO: gracefully close consumer channels
  console.log("[users][RabbitMQ] Consumer stub — stopping");
}
