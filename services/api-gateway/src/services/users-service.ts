import { getCorrelationId } from "@score-cripto/observability-node";
import { config } from "../config.js";

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

export async function checkUsage(userId: string): Promise<CheckUsageResult> {
  const url = `${config.usersServiceUrl}/usage/check`;

  let response: Response;
  try {
    const correlationId = getCorrelationId();
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(correlationId ? { "x-request-id": correlationId } : {}),
      },
      body: JSON.stringify({ userId }),
    });
  } catch (err) {
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
      // ignore parse error
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
