import type { Message } from "amqplib";

export const CORRELATION_HEADER = "x-correlation-id";

/**
 * Extracts the correlation ID from an AMQP message's headers.
 * Handles both string and Buffer header values (RabbitMQ may deliver buffers).
 */
export function extractCorrelationId(msg: Message): string | undefined {
  const headers = msg.properties?.headers;
  if (!headers) return undefined;

  const value = headers[CORRELATION_HEADER];
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return undefined;
}

/**
 * Returns a new headers object with the correlation ID injected.
 */
export function injectCorrelationId(
  headers: Record<string, unknown>,
  correlationId: string,
): Record<string, unknown> {
  return { ...headers, [CORRELATION_HEADER]: correlationId };
}
