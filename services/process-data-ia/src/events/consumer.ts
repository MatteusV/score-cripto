import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { z } from "zod";
import { config } from "../config.js";
import { createCalculateScore } from "../orchestrators/calculate-score.js";
import { WalletContextInputSchema } from "../schemas/score.js";

const EXCHANGE_NAME = "score-cripto.events";
const EXCHANGE_TYPE = "topic";
const QUEUE_NAME = "process-data-ia.wallet.data.cached";
const ROUTING_KEY = "wallet.data.cached";

const WalletDataCachedEventSchema = z.object({
	event: z.literal("wallet.data.cached"),
	timestamp: z.string(),
	data: z.object({
		userId: z.string(),
		walletContext: WalletContextInputSchema,
	}),
});

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function startConsumer(): Promise<void> {
	try {
		connection = await amqplib.connect(config.rabbitmqUrl);
		channel = await connection.createChannel();

		await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
		await channel.assertQueue(QUEUE_NAME, { durable: true });
		await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

		channel.prefetch(1);

		channel.consume(QUEUE_NAME, async (msg) => {
			if (!msg) return;

			try {
				const raw = JSON.parse(msg.content.toString());
				const parsed = WalletDataCachedEventSchema.safeParse(raw);

				if (!parsed.success) {
					console.error("[Consumer] Invalid event payload:", parsed.error.flatten());
					channel?.nack(msg, false, false); // dead-letter, don't requeue
					return;
				}

				const { userId, walletContext } = parsed.data.data;
				const orchestrator = createCalculateScore();

				await orchestrator.execute({ walletContext, userId });

				channel?.ack(msg);
				console.log(`[Consumer] Processed wallet.data.cached for ${walletContext.chain}:${walletContext.address}`);
			} catch (error) {
				console.error("[Consumer] Failed to process event:", (error as Error).message);
				channel?.nack(msg, false, true); // requeue on unexpected errors
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
			(error as Error).message,
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
