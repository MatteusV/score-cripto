import type { Message } from "amqplib";
import { observabilityStorage } from "../context.js";
import { extractCorrelationId } from "./headers.js";

/**
 * Wraps an AMQP message handler in an AsyncLocalStorage context populated
 * with the correlation ID from the message headers.
 *
 * Falls back to a new UUID if the header is absent (e.g. legacy publishers).
 */
export function withCorrelation<T>(
  msg: Message,
  fn: (correlationId: string) => Promise<T>,
): Promise<T> {
  const correlationId = extractCorrelationId(msg) ?? crypto.randomUUID();
  return observabilityStorage.run({ correlationId }, () => fn(correlationId));
}
