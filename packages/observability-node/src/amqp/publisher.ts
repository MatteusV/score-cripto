import type { Channel, Options } from "amqplib";
import { CORRELATION_HEADER } from "./headers.js";

/**
 * Wraps channel.publish to inject x-correlation-id in AMQP headers.
 * Returns the same boolean as channel.publish (channel write buffer status).
 */
export function publishWithCorrelation(
  channel: Channel,
  exchange: string,
  routingKey: string,
  content: Buffer,
  options: Options.Publish,
  correlationId: string,
): boolean {
  return channel.publish(exchange, routingKey, content, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      [CORRELATION_HEADER]: correlationId,
    },
  });
}
