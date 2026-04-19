// Logger
export {
  createLogger,
  DEFAULT_REDACT_PATHS,
  getLoggerOptions,
} from "./logger.js";
export type { CreateLoggerOptions, Logger } from "./logger.js";

// PII redaction
export { maskAddress, hashUserId } from "./redact.js";

// Async correlation context
export { observabilityStorage, getCorrelationId } from "./context.js";
export type { ObsContext } from "./context.js";

// Fastify plugin
export { observabilityPlugin } from "./http/fastify-plugin.js";

// AMQP helpers
export {
  CORRELATION_HEADER,
  extractCorrelationId,
  injectCorrelationId,
} from "./amqp/headers.js";
export { publishWithCorrelation } from "./amqp/publisher.js";
export { withCorrelation } from "./amqp/consumer.js";
