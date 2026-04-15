import { withCorrelation } from "@score-cripto/observability-node";
import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { z } from "zod";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { WalletContextInputSchema } from "../schemas/score.js";
import { makeAnalysisWorkflow } from "../use-cases/analysis-workflow/analysis-workflow.js";
import { assertDlqForQueue, dlqArgumentsFor } from "./dlq-topology.js";
import { publishScoreFailed } from "./publisher.js";
import { assertRetryQueueFor, scheduleRetry } from "./retry-topology.js";

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
  raw: string,
  correlationId?: string
): Promise<ProcessMessageResult> {
  const msgLog = correlationId ? logger.child({ correlationId }) : logger;

  const parsed = WalletDataCachedEventSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    msgLog.error(
      { errors: parsed.error.flatten() },
      "Invalid wallet.data.cached payload"
    );
    // Tentar extrair requestId do payload malformado para publicar evento de falha
    try {
      const partial = JSON.parse(raw) as Record<string, unknown>;
      const requestId = (partial?.data as Record<string, unknown>)?.requestId;
      if (typeof requestId === "string" && requestId) {
        publishScoreFailed({
          requestId,
          reason: "Invalid or malformed event payload",
        });
      }
    } catch {
      // JSON.parse falhou também — não há requestId disponível
    }
    return { outcome: "invalid_payload" };
  }

  const { requestId, userId, walletContext } = parsed.data.data;

  msgLog.info(
    { requestId, chain: walletContext.chain },
    "wallet.data.cached received"
  );

  const orchestrator = makeAnalysisWorkflow();
  await orchestrator.execute({ requestId, walletContext, userId });

  msgLog.info({ requestId }, "wallet.data.cached processed");
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
          const result = await processWalletDataCachedMessage(
            msg.content.toString(),
            correlationId
          );

          if (result.outcome === "invalid_payload") {
            channel?.nack(msg, false, false);
          } else {
            channel?.ack(msg);
          }
        } catch (error) {
          logger.error(
            { correlationId, err: (error as Error).message },
            "Failed to process event (transient)"
          );
          if (channel) {
            const scheduled = scheduleRetry(channel, msg, QUEUE_NAME);
            if (scheduled) {
              channel.ack(msg);
            } else {
              channel.nack(msg, false, false);
            }
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
