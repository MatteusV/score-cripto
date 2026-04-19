import pino from "pino";
export type { Logger } from "pino";

export interface CreateLoggerOptions {
  service: string;
  level?: string;
  pretty?: boolean;
}

/**
 * Default redact paths applied to every logger created via this package.
 * Blocks bearer tokens, session cookies, API keys and common credential
 * field names from ever reaching the log sink, regardless of how the
 * object is shaped at the call site.
 */
export const DEFAULT_REDACT_PATHS: readonly string[] = [
  // HTTP headers (request)
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  // HTTP headers (response)
  'res.headers["set-cookie"]',
  // Wildcards — match credential-like fields at any depth
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "*.secret",
  "*.clientSecret",
  "*.privateKey",
];

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

  const common: pino.LoggerOptions = {
    level,
    base,
    redact: {
      paths: [...DEFAULT_REDACT_PATHS],
      censor: "[REDACTED]",
    },
  };

  if (pretty) {
    return {
      ...common,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      },
    };
  }

  return common;
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
