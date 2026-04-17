import { createLogger, type Logger } from "@score-cripto/observability-node";

export const logger: Logger = createLogger({ service: "process-data-ia" });
