type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  route: string
  message: string
  timestamp: string
  errorMessage?: string
  errorStack?: string
  [key: string]: unknown
}

interface Logger {
  info(message: string, ctx?: Record<string, unknown>): void
  warn(message: string, ctx?: Record<string, unknown>): void
  error(message: string, ctx?: Record<string, unknown>, err?: Error): void
}

export function createLogger(route: string): Logger {
  function log(level: LogLevel, message: string, ctx: Record<string, unknown> = {}, err?: Error): void {
    const entry: LogEntry = {
      level,
      route,
      message,
      timestamp: new Date().toISOString(),
      ...ctx,
    }

    if (err instanceof Error) {
      entry.errorMessage = err.message
      entry.errorStack = err.stack
    }

    const line = JSON.stringify(entry)

    if (level === "info") console.info(line)
    else if (level === "warn") console.warn(line)
    else console.error(line)
  }

  return {
    info: (message, ctx) => log("info", message, ctx),
    warn: (message, ctx) => log("warn", message, ctx),
    error: (message, ctx, err) => log("error", message, ctx, err),
  }
}
