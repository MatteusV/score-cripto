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

// Analysis pipeline stage events
export {
  ANALYSIS_EVENTS_EXCHANGE,
  ANALYSIS_STAGE_CHANGED_ROUTING_KEY,
  ANALYSIS_STAGE_CHANGED_EVENT_NAME,
  ANALYSIS_STAGE_SCHEMA_VERSION,
  ANALYSIS_STAGES,
  ANALYSIS_STAGE_STATES,
  ANALYSIS_STAGE_SERVICES,
} from "./events/analysis-stage.js";
export type {
  AnalysisStage,
  AnalysisStageState,
  AnalysisStageService,
  AnalysisStageChangedPayload,
  AnalysisStageChangedEnvelope,
} from "./events/analysis-stage.js";
