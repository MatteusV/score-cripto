import { getCorrelationId } from "@score-cripto/observability-node";
import { config } from "../config.js";

export interface ForwardOptions {
  authHeader?: string;
  body?: unknown;
  extraHeaders?: Record<string, string>;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  queryString?: string;
  rawBody?: Buffer | string;
}

export interface ForwardResult {
  data: unknown;
  status: number;
}

export class UsersForwardError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "UsersForwardError";
    this.statusCode = statusCode;
  }
}

export async function forwardToUsers(
  opts: ForwardOptions
): Promise<ForwardResult> {
  const correlationId = getCorrelationId();
  const url = `${config.usersServiceUrl}${opts.path}${opts.queryString ?? ""}`;

  const headers: Record<string, string> = {
    ...(opts.extraHeaders ?? {}),
  };
  if (opts.authHeader) {
    headers.Authorization = opts.authHeader;
  }
  if (correlationId) {
    headers["x-request-id"] = correlationId;
  }

  let fetchBody: Buffer | string | undefined;
  if (opts.rawBody !== undefined) {
    fetchBody = opts.rawBody;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.usersServiceTimeoutMs
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: opts.method,
      headers,
      body: fetchBody,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      throw new UsersForwardError("users service timeout", 504);
    }
    throw new UsersForwardError(
      `Failed to reach users service: ${(err as Error).message}`,
      503
    );
  }
  clearTimeout(timeoutId);

  const text = await response.text();
  let data: unknown;
  if (text.length === 0) {
    data = null;
  } else {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: response.status, data };
}
