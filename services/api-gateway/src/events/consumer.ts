import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { z } from "zod";
import { config } from "../config.js";
import { publishUserAnalysisConsumed } from "../events/publisher.js";
import { AnalysisRequestPrismaRepository } from "../repositories/prisma/analysis-request-prisma-repository.js";
import { prisma } from "../services/database.js";
import { CompleteAnalysisRequestUseCase } from "../use-cases/analysis-request/complete-analysis-request-use-case.js";
import { FailAnalysisRequestUseCase } from "../use-cases/analysis-request/fail-analysis-request-use-case.js";
import { assertDlqForQueue, dlqArgumentsFor } from "./dlq-topology.js";
import { assertRetryQueueFor, scheduleRetry } from "./retry-topology.js";

const EXCHANGE_NAME = "score-cripto.events";
const EXCHANGE_TYPE = "topic";

const QUEUE_CALCULATED = "api-gateway.wallet.score.calculated";
const QUEUE_FAILED = "api-gateway.wallet.score.failed";

const ScoreCalculatedEventSchema = z.object({
  event: z.literal("wallet.score.calculated"),
  timestamp: z.string(),
  data: z.object({
    requestId: z.string(),
    chain: z.string(),
    address: z.string(),
    score: z.number().int(),
    confidence: z.number(),
    reasoning: z.string(),
    positiveFactors: z.array(z.string()),
    riskFactors: z.array(z.string()),
    modelVersion: z.string(),
    promptVersion: z.string(),
  }),
});

const ScoreFailedEventSchema = z.object({
  event: z.literal("wallet.score.failed"),
  timestamp: z.string(),
  data: z.object({
    requestId: z.string(),
    reason: z.string(),
  }),
});

const repository = new AnalysisRequestPrismaRepository(prisma);
const completeUseCase = new CompleteAnalysisRequestUseCase(repository);
const failUseCase = new FailAnalysisRequestUseCase(repository);

export async function handleScoreCalculated(raw: string): Promise<void> {
  const parsed = ScoreCalculatedEventSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error(
      "[api-gateway][Consumer] Invalid wallet.score.calculated payload:",
      parsed.error.flatten()
    );
    throw new Error("invalid_payload");
  }

  const {
    requestId,
    chain,
    address,
    score,
    confidence,
    reasoning,
    positiveFactors,
    riskFactors,
    modelVersion,
    promptVersion,
  } = parsed.data.data;

  console.log(`RECEBIDO: wallet.score.calculated | requestId=${requestId}`);

  const { analysisRequest } = await completeUseCase.execute({
    id: requestId,
    result: {
      score,
      confidence,
      reasoning,
      positiveFactors,
      riskFactors,
      modelVersion,
      promptVersion,
    },
  });

  publishUserAnalysisConsumed({
    userId: analysisRequest.userId,
    analysisId: requestId,
    status: "completed",
    chain,
    address,
  });
}

export async function handleScoreFailed(raw: string): Promise<void> {
  const parsed = ScoreFailedEventSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error(
      "[api-gateway][Consumer] Invalid wallet.score.failed payload:",
      parsed.error.flatten()
    );
    throw new Error("invalid_payload");
  }

  const { requestId, reason } = parsed.data.data;

  console.log(`RECEBIDO: wallet.score.failed | requestId=${requestId}`);

  const { analysisRequest } = await failUseCase.execute({
    id: requestId,
    reason,
  });

  publishUserAnalysisConsumed({
    userId: analysisRequest.userId,
    analysisId: requestId,
    status: "failed",
    chain: analysisRequest.chain,
    address: analysisRequest.address,
  });
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

    // DLQ: declarar DLX + DLQs antes das filas de origem
    await assertDlqForQueue(channel, QUEUE_CALCULATED);
    await assertDlqForQueue(channel, QUEUE_FAILED);

    // Retry queues (TTL + dead-letter de volta para a origem)
    await assertRetryQueueFor(
      channel,
      QUEUE_CALCULATED,
      EXCHANGE_NAME,
      "wallet.score.calculated"
    );
    await assertRetryQueueFor(
      channel,
      QUEUE_FAILED,
      EXCHANGE_NAME,
      "wallet.score.failed"
    );

    // Fila: wallet.score.calculated
    await channel.assertQueue(QUEUE_CALCULATED, {
      durable: true,
      arguments: dlqArgumentsFor(QUEUE_CALCULATED),
    });
    await channel.bindQueue(
      QUEUE_CALCULATED,
      EXCHANGE_NAME,
      "wallet.score.calculated"
    );

    // Fila: wallet.score.failed
    await channel.assertQueue(QUEUE_FAILED, {
      durable: true,
      arguments: dlqArgumentsFor(QUEUE_FAILED),
    });
    await channel.bindQueue(QUEUE_FAILED, EXCHANGE_NAME, "wallet.score.failed");

    channel.prefetch(1);

    channel.consume(QUEUE_CALCULATED, async (msg) => {
      if (!msg) {
        return;
      }
      try {
        await handleScoreCalculated(msg.content.toString());
        channel?.ack(msg);
      } catch (error) {
        const e = error as Error;
        console.error(
          "[api-gateway][Consumer] wallet.score.calculated error:",
          e.message
        );
        if (e.message === "invalid_payload") {
          channel?.nack(msg, false, false); // payload inválido → DLQ direto
          return;
        }
        if (channel) {
          const scheduled = scheduleRetry(channel, msg, QUEUE_CALCULATED);
          if (scheduled) {
            channel.ack(msg); // agendado na retry queue com backoff
          } else {
            channel.nack(msg, false, false); // max retries esgotadas → DLQ
          }
        }
      }
    });

    channel.consume(QUEUE_FAILED, async (msg) => {
      if (!msg) {
        return;
      }
      try {
        await handleScoreFailed(msg.content.toString());
        channel?.ack(msg);
      } catch (error) {
        const e = error as Error;
        console.error(
          "[api-gateway][Consumer] wallet.score.failed error:",
          e.message
        );
        if (e.message === "invalid_payload") {
          channel?.nack(msg, false, false); // payload inválido → DLQ direto
          return;
        }
        if (channel) {
          const scheduled = scheduleRetry(channel, msg, QUEUE_FAILED);
          if (scheduled) {
            channel.ack(msg); // agendado na retry queue com backoff
          } else {
            channel.nack(msg, false, false); // max retries esgotadas → DLQ
          }
        }
      }
    });

    connection.on("close", () => {
      console.log("[api-gateway][Consumer] Connection closed");
      connection = null;
      channel = null;
    });

    connection.on("error", (err) => {
      console.error("[api-gateway][Consumer] Connection error:", err.message);
    });

    console.log(
      `[api-gateway][Consumer] Listening on queues: ${QUEUE_CALCULATED}, ${QUEUE_FAILED}`
    );
  } catch (error) {
    console.warn(
      "[api-gateway][Consumer] Failed to connect:",
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
