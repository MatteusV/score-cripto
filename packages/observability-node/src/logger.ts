import pino from "pino";

export interface CreateLoggerOptions {
  service: string;
  level?: string;
  pretty?: boolean;
}

/**
 * Returns pino options suitable for use in Fastify's `logger` config or `pino()` directly.
 * Use this when you need the config object (e.g., Fastify v5 logger option).
 */
export function getLoggerOptions(opts: CreateLoggerOptions): pino.LoggerOptions {
  const {
    service,
    level = process.env.LOG_LEVEL ?? "info",
    pretty = process.env.LOG_PRETTY === "true",
  } = opts;

  const base = {
    service,
    env: process.env.DEPLOY_ENV ?? "dev",
    version: process.env.SERVICE_VERSION ?? "0.1.0",
  };

  if (pretty) {
    return {
      level,
      base,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      },
    };
  }

  return { level, base };
}

/**
 * Creates a structured pino logger with base bindings for service, env, version.
 * Use for standalone loggers in workers/consumers/publishers.
 *
 * Respects environment variables:
 *   LOG_LEVEL  - pino level (default: info)
 *   LOG_PRETTY - set to "true" to activate pino-pretty (default: false)
 *   DEPLOY_ENV - deployment environment label (default: dev)
 *   SERVICE_VERSION - service version (default: 0.1.0)
 */
export function createLogger(opts: CreateLoggerOptions): pino.Logger {
  return pino(getLoggerOptions(opts));
}
