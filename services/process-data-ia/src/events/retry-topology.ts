import type { Channel, ConsumeMessage } from "amqplib";

export const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export function getRetryCount(msg: ConsumeMessage): number {
  const raw = msg.properties.headers?.["x-retry-count"];
  return typeof raw === "number" ? raw : 0;
}

export function computeBackoffMs(retryCount: number): number {
  const base = BASE_DELAY_MS * 2 ** retryCount;
  const jitter = 0.9 + Math.random() * 0.2;
  return Math.round(base * jitter);
}

export async function assertRetryQueueFor(
  channel: Channel,
  sourceQueue: string,
  sourceExchange: string,
  sourceRoutingKey: string
): Promise<void> {
  const retryQueue = `${sourceQueue}.retry`;
  await channel.assertQueue(retryQueue, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": sourceExchange,
      "x-dead-letter-routing-key": sourceRoutingKey,
    },
  });
}

/**
 * Publica a mensagem na retry queue com TTL de backoff exponencial.
 * Retorna true se o retry foi agendado; false se max retries esgotadas
 * (o caller deve rotear para DLQ via nack).
 */
export function scheduleRetry(
  channel: Channel,
  msg: ConsumeMessage,
  sourceQueue: string
): boolean {
  const currentCount = getRetryCount(msg);
  if (currentCount >= MAX_RETRIES) {
    return false;
  }
  const delay = computeBackoffMs(currentCount);
  const retryQueue = `${sourceQueue}.retry`;
  channel.sendToQueue(retryQueue, msg.content, {
    persistent: true,
    expiration: String(delay),
    headers: {
      ...msg.properties.headers,
      "x-retry-count": currentCount + 1,
    },
  });
  return true;
}
