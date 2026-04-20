import { BrokenCircuitError, TaskCancelledError } from "cockatiel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkUsage } from "./users-service.js";

// Mock de dependências externas ao módulo
vi.mock("../config.js", () => ({
  config: {
    usersServiceUrl: "http://users-mock:3003",
    usersServiceTimeoutMs: 100, // curto para testes rápidos
    usersServiceRetryAttempts: 1,
    usersServiceRetryBackoffMs: 10,
    usersServiceBreakerThreshold: 0.5,
    usersServiceBreakerHalfOpenAfterMs: 50_000,
  },
}));

vi.mock("@score-cripto/observability-node", () => ({
  getCorrelationId: () => "test-correlation-id",
}));

vi.mock("../observability/metrics.js", () => ({
  usersCheckDurationHistogram: { record: vi.fn() },
  usersCheckFailOpenCounter: { add: vi.fn() },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeOkResponse(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function makeErrorResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("checkUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna CheckUsageResult no sucesso", async () => {
    const expected = {
      allowed: true,
      limit: 5,
      remaining: 3,
      resetsAt: "2026-05-01T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce(makeOkResponse(expected));

    const result = await checkUsage("Bearer token-user-123");

    expect(result).toEqual(expected);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://users-mock:3003/usage/check",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-request-id": "test-correlation-id",
          Authorization: "Bearer token-user-123",
        }),
      })
    );
  });

  it("lança UsersServiceError(429) em resposta 429, sem retry", async () => {
    mockFetch.mockResolvedValue(
      makeErrorResponse(429, { message: "Monthly limit reached" })
    );

    await expect(checkUsage("Bearer token-user-429")).rejects.toMatchObject({
      name: "UsersServiceError",
      statusCode: 429,
      message: "Monthly limit reached",
    });

    // Resposta 429 não deve ser retentada: fetch chamado no máximo 2x (1 tentativa + 1 retry),
    // mas como isRetryable retorna false para 429, deve ser chamado apenas 1x.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("lança UsersServiceError(5xx) após 1 retry em resposta 500", async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(500, { error: "Internal" }));

    await expect(checkUsage("Bearer token-user-500")).rejects.toMatchObject({
      name: "UsersServiceError",
      statusCode: 500,
    });

    // 1 retry configurado → fetch chamado 2x
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("lança UsersServiceError(503) após 1 retry em erro de rede", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(checkUsage("Bearer token-user-net")).rejects.toMatchObject({
      name: "UsersServiceError",
      statusCode: 503,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("encaminha x-request-id de correlação no header", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ allowed: true, limit: 5, remaining: 4, resetsAt: "" })
    );

    await checkUsage("Bearer token-user-corr");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-request-id": "test-correlation-id",
        }),
      })
    );
  });

  it("não faz retry em erros 4xx (ex: 404)", async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(404, { error: "Not found" }));

    await expect(checkUsage("Bearer token-user-404")).rejects.toMatchObject({
      name: "UsersServiceError",
      statusCode: 404,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("lança UsersServiceError(503) quando BrokenCircuitError é lançado pelo breaker", async () => {
    // Simula o breaker em estado aberto forçando a policy a lançar BrokenCircuitError
    mockFetch.mockRejectedValue(new BrokenCircuitError());

    // Com threshold=50% e minimumRps=1, precisamos de falhas suficientes para abrir.
    // Neste teste, simulamos diretamente o BrokenCircuitError no fetch.
    await expect(checkUsage("Bearer token-user-breaker")).rejects.toMatchObject(
      {
        name: "UsersServiceError",
        statusCode: 503,
        message: "users service circuit open",
      }
    );
  });

  it("lança UsersServiceError(504) quando TaskCancelledError é lançado pelo timeout", async () => {
    // Simula timeout lançando TaskCancelledError diretamente
    mockFetch.mockRejectedValue(new TaskCancelledError());

    await expect(checkUsage("Bearer token-user-timeout")).rejects.toMatchObject(
      {
        name: "UsersServiceError",
        statusCode: 504,
        message: "users service timeout",
      }
    );
  });
});
