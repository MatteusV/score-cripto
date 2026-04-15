import { getCorrelationId } from "@score-cripto/observability-node";
import {
  BrokenCircuitError,
  ConstantBackoff,
  circuitBreaker,
  handleAll,
  handleWhen,
  retry,
  SamplingBreaker,
  TaskCancelledError,
  TimeoutStrategy,
  timeout,
  wrap,
} from "cockatiel";
import { config } from "../config.js";
import {
  usersCheckDurationHistogram,
  usersCheckFailOpenCounter,
} from "../observability/metrics.js";

export interface CheckUsageResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetsAt: string;
}

export class UsersServiceError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "UsersServiceError";
    this.statusCode = statusCode;
  }
}

// Determina se o erro deve disparar um retry.
// 429/4xx são respostas de negócio — não adianta tentar de novo.
// Timeout (TaskCancelledError): já expirou — não retentar.
// BrokenCircuitError: circuito aberto — não tentar.
function isRetryable(err: Error): boolean {
  if (err instanceof TaskCancelledError) {
    return false;
  }
  if (err instanceof BrokenCircuitError) {
    return false;
  }
  if (err instanceof UsersServiceError && err.statusCode < 500) {
    return false;
  }
  return true;
}

// Policy singleton: estado do circuit breaker compartilhado entre chamadas.
const timeoutPolicy = timeout(
  config.usersServiceTimeoutMs,
  TimeoutStrategy.Aggressive
);

const retryPolicy = retry(handleWhen(isRetryable), {
  maxAttempts: config.usersServiceRetryAttempts,
  backoff: new ConstantBackoff(config.usersServiceRetryBackoffMs),
});

const breakerPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: config.usersServiceBreakerHalfOpenAfterMs,
  breaker: new SamplingBreaker({
    threshold: config.usersServiceBreakerThreshold,
    duration: 10_000,
    minimumRps: 1,
  }),
});

// Wrap: breaker → retry → timeout → user code
const policy = wrap(breakerPolicy, retryPolicy, timeoutPolicy);

export async function checkUsage(userId: string): Promise<CheckUsageResult> {
  const url = `${config.usersServiceUrl}/usage/check`;
  const start = Date.now();

  // doFetch captura userId e url via closure — sem estado compartilhado entre requisições.
  async function doFetch(signal: AbortSignal): Promise<CheckUsageResult> {
    const correlationId = getCorrelationId();

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(correlationId ? { "x-request-id": correlationId } : {}),
        },
        body: JSON.stringify({ userId }),
        signal,
      });
    } catch (err) {
      // Re-lançar erros do framework cockatiel sem encapsular
      if (
        err instanceof BrokenCircuitError ||
        err instanceof TaskCancelledError
      ) {
        throw err;
      }
      throw new UsersServiceError(
        `Failed to reach users service: ${(err as Error).message}`,
        503
      );
    }

    if (response.status === 429) {
      let message = "Usage limit exceeded";
      try {
        const body = (await response.json()) as { message?: string };
        if (body.message) {
          message = body.message;
        }
      } catch {
        // ignorar erro de parse
      }
      throw new UsersServiceError(message, 429);
    }

    if (!response.ok) {
      throw new UsersServiceError(
        `Users service returned ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<CheckUsageResult>;
  }

  try {
    const result = await policy.execute((ctx) => doFetch(ctx.signal));
    usersCheckDurationHistogram.record(Date.now() - start, { outcome: "ok" });
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;

    if (err instanceof BrokenCircuitError) {
      usersCheckDurationHistogram.record(elapsed, { outcome: "circuit_open" });
      usersCheckFailOpenCounter.add(1, { reason: "circuit_open" });
      throw new UsersServiceError("users service circuit open", 503);
    }

    if (err instanceof TaskCancelledError) {
      usersCheckDurationHistogram.record(elapsed, { outcome: "timeout" });
      usersCheckFailOpenCounter.add(1, { reason: "timeout" });
      throw new UsersServiceError("users service timeout", 504);
    }

    if (err instanceof UsersServiceError) {
      const outcome = err.statusCode === 429 ? "429" : "server_error";
      usersCheckDurationHistogram.record(elapsed, { outcome });
      if (err.statusCode !== 429) {
        usersCheckFailOpenCounter.add(1, { reason: "server_error" });
      }
      throw err;
    }

    // Erro de rede não encapsulado pelo doFetch
    usersCheckDurationHistogram.record(elapsed, { outcome: "network_error" });
    usersCheckFailOpenCounter.add(1, { reason: "network_error" });
    throw new UsersServiceError(
      `Failed to reach users service: ${(err as Error).message}`,
      503
    );
  }
}
