import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { z } from "zod";
import { config } from "../config.js";
import { createProcessWalletCachedEvent } from "../orchestrators/process-wallet-cached-event.js";
import { WalletContextInputSchema } from "../schemas/score.js";

const EXCHANGE_NAME = "score-cripto.events";
const EXCHANGE_TYPE = "topic";
const QUEUE_NAME = "process-data-ia.wallet.data.cached";
const ROUTING_KEY = "wallet.data.cached";

export const WalletDataCachedEventSchema = z.object({
  event: z.literal("wallet.data.cached"),
  timestamp: z.string(),
  data: z.object({
    requestId: z.string(),
    userId: z.string(),
    walletContext: WalletContextInputSchema,
  }),
});

export type WalletDataCachedEvent = z.infer<typeof WalletDataCachedEventSchema>;

export interface ProcessMessageResult {
  outcome: "processed" | "invalid_payload";
}

export async function processWalletDataCachedMessage(
  raw: string
): Promise<ProcessMessageResult> {
  const parsed = WalletDataCachedEventSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error("[Consumer] Invalid event payload:", parsed.error.flatten());
    return { outcome: "invalid_payload" };
  }

  const { requestId, userId, walletContext } = parsed.data.data;

  console.log(`RECEBIDO: wallet.data.cached | requestId=${requestId} chain=${walletContext.chain} address=${walletContext.address}`);

  const orchestrator = createProcessWalletCachedEvent();
  await orchestrator.execute({ requestId, walletContext, userId });

  console.log(
    `[Consumer] Processed wallet.data.cached for ${walletContext.chain}:${walletContext.address}`
  );
  return { outcome: "processed" };
}

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

      try {
        const result = await processWalletDataCachedMessage(
          msg.content.toString()
        );

        if (result.outcome === "invalid_payload") {
          channel?.nack(msg, false, false); // dead-letter
        } else {
          channel?.ack(msg);
        }
      } catch (error) {
        console.error(
          "[Consumer] Failed to process event (transient):",
          (error as Error).message
        );

        // Erros transitórios (rede, DB) recolocam na fila para retry
        channel?.nack(msg, false, true);
      }
    });

    connection.on("close", () => {
      console.log("[Consumer] Connection closed");
      connection = null;
      channel = null;
    });

    connection.on("error", (err) => {
      console.error("[Consumer] Connection error:", err.message);
    });

    console.log(`[Consumer] Listening on queue: ${QUEUE_NAME}`);
  } catch (error) {
    console.warn(
      "[Consumer] Failed to connect, events will not be consumed:",
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
    // ignore close errors
  } finally {
    channel = null;
    connection = null;
  }
}
