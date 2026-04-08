import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../services/database.js";

const EXCHANGE_NAME = "score-cripto.events";
const EXCHANGE_TYPE = "topic";

const QUEUE_CALCULATED = "api-gateway.wallet.score.calculated";
const QUEUE_FAILED = "api-gateway.wallet.score.failed";

const ScoreCalculatedEventSchema = z.object({
  event: z.literal("wallet.score.calculated"),
  timestamp: z.string(),
  data: z.object({
    processId: z.string(),
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
    processId: z.string(),
    reason: z.string(),
  }),
});

export async function handleScoreCalculated(raw: string): Promise<void> {
  const parsed = ScoreCalculatedEventSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    console.error(
      "[api-gateway][Consumer] Invalid wallet.score.calculated payload:",
      parsed.error.flatten()
    );
    throw new Error("invalid_payload");
  }

  const { processId, score, confidence, reasoning, positiveFactors, riskFactors, modelVersion, promptVersion } =
    parsed.data.data;

  console.log(`RECEBIDO: wallet.score.calculated | processId=${processId}`);

  await prisma.analysisRequest.update({
    where: { id: processId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      score,
      confidence,
      reasoning,
      positiveFactors,
      riskFactors,
      modelVersion,
      promptVersion,
    },
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

  const { processId, reason } = parsed.data.data;

  console.log(`RECEBIDO: wallet.score.failed | processId=${processId}`);

  await prisma.analysisRequest.update({
    where: { id: processId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureReason: reason,
    },
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

    // Fila: wallet.score.calculated
    await channel.assertQueue(QUEUE_CALCULATED, { durable: true });
    await channel.bindQueue(QUEUE_CALCULATED, EXCHANGE_NAME, "wallet.score.calculated");

    // Fila: wallet.score.failed
    await channel.assertQueue(QUEUE_FAILED, { durable: true });
    await channel.bindQueue(QUEUE_FAILED, EXCHANGE_NAME, "wallet.score.failed");

    channel.prefetch(1);

    channel.consume(QUEUE_CALCULATED, async (msg) => {
      if (!msg) return;
      try {
        await handleScoreCalculated(msg.content.toString());
        channel?.ack(msg);
      } catch (error) {
        console.error("[api-gateway][Consumer] wallet.score.calculated error:", (error as Error).message);
        const isInvalid = (error as Error).message === "invalid_payload";
        channel?.nack(msg, false, !isInvalid);
      }
    });

    channel.consume(QUEUE_FAILED, async (msg) => {
      if (!msg) return;
      try {
        await handleScoreFailed(msg.content.toString());
        channel?.ack(msg);
      } catch (error) {
        console.error("[api-gateway][Consumer] wallet.score.failed error:", (error as Error).message);
        const isInvalid = (error as Error).message === "invalid_payload";
        channel?.nack(msg, false, !isInvalid);
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

    console.log(`[api-gateway][Consumer] Listening on queues: ${QUEUE_CALCULATED}, ${QUEUE_FAILED}`);
  } catch (error) {
    console.warn(
      "[api-gateway][Consumer] Failed to connect:",
      (error as Error).message
    );
  }
}

export async function stopConsumer(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    // ignore close errors
  } finally {
    channel = null;
    connection = null;
  }
}
