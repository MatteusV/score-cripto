import { withCorrelation } from "@score-cripto/observability-node";
import amqplib, { type Channel, type ChannelModel } from "amqplib";
import type { Logger } from "pino";
import { z } from "zod";
import { config } from "../config.js";
import { publishUserAnalysisConsumed } from "../events/publisher.js";
import { logger } from "../logger.js";
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

export async function handleScoreCalculated(
  raw: string,
  log: Logger = logger
): Promise<void> {
  const parsed = ScoreCalculatedEventSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    log.error(
      { errors: parsed.error.flatten() },
      "Invalid wallet.score.calculated payload"
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

  log.info({ requestId, chain }, "wallet.score.calculated received");

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

export async function handleScoreFailed(
  raw: string,
  log: Logger = logger
): Promise<void> {
  const parsed = ScoreFailedEventSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    log.error(
      { errors: parsed.error.flatten() },
      "Invalid wallet.score.failed payload"
    );
    throw new Error("invalid_payload");
  }

  const { requestId, reason } = parsed.data.data;

  log.info({ requestId }, "wallet.score.failed received");

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

    await assertDlqForQueue(channel, QUEUE_CALCULATED);
    await assertDlqForQueue(channel, QUEUE_FAILED);

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

    await channel.assertQueue(QUEUE_CALCULATED, {
      durable: true,
      arguments: dlqArgumentsFor(QUEUE_CALCULATED),
    });
    await channel.bindQueue(
      QUEUE_CALCULATED,
      EXCHANGE_NAME,
      "wallet.score.calculated"
    );

    await channel.assertQueue(QUEUE_FAILED, {
      durable: true,
      arguments: dlqArgumentsFor(QUEUE_FAILED),
    });
    await channel.bindQueue(QUEUE_FAILED, EXCHANGE_NAME, "wallet.score.failed");

    channel.prefetch(1);

    channel.consume(QUEUE_CALCULATED, (msg) => {
      if (!msg) {
        return;
      }
      withCorrelation(msg, async (correlationId) => {
        const msgLog = logger.child({ correlationId, queue: QUEUE_CALCULATED });
        try {
          await handleScoreCalculated(msg.content.toString(), msgLog);
          channel?.ack(msg);
        } catch (error) {
          const e = error as Error;
          msgLog.error(
            { err: e.message },
            "wallet.score.calculated handler error"
          );
          if (e.message === "invalid_payload") {
            channel?.nack(msg, false, false);
            return;
          }
          if (channel) {
            const scheduled = scheduleRetry(channel, msg, QUEUE_CALCULATED);
            if (scheduled) {
              channel.ack(msg);
            } else {
              channel.nack(msg, false, false);
            }
          }
        }
      });
    });

    channel.consume(QUEUE_FAILED, (msg) => {
      if (!msg) {
        return;
      }
      withCorrelation(msg, async (correlationId) => {
        const msgLog = logger.child({ correlationId, queue: QUEUE_FAILED });
        try {
          await handleScoreFailed(msg.content.toString(), msgLog);
          channel?.ack(msg);
        } catch (error) {
          const e = error as Error;
          msgLog.error({ err: e.message }, "wallet.score.failed handler error");
          if (e.message === "invalid_payload") {
            channel?.nack(msg, false, false);
            return;
          }
          if (channel) {
            const scheduled = scheduleRetry(channel, msg, QUEUE_FAILED);
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

    logger.info(
      { queues: [QUEUE_CALCULATED, QUEUE_FAILED] },
      "Consumer started"
    );
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
