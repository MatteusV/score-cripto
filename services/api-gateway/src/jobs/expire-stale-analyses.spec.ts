import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../observability/metrics.js", () => ({
  staleAnalysisExpiredCounter: { add: vi.fn() },
}));

vi.mock("../logger.js", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { AnalysisRequestInMemoryRepository } from "../repositories/in-memory/analysis-request-in-memory-repository.js";
import { expireStaleAnalyses } from "./expire-stale-analyses.js";

function makeRequest(
  overrides: Partial<{
    status: string;
    requestedAt: Date;
  }> = {}
) {
  return {
    userId: "user-1",
    chain: "ethereum",
    address: "0xabc",
    ...overrides,
  };
}

describe("expireStaleAnalyses", () => {
  let repo: AnalysisRequestInMemoryRepository;

  beforeEach(() => {
    repo = new AnalysisRequestInMemoryRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna 0 quando não há análises stale", async () => {
    const count = await expireStaleAnalyses(repo, 600_000);
    expect(count).toBe(0);
  });

  it("expira análises PENDING mais antigas que o threshold", async () => {
    // Criar análise antiga (1 hora atrás)
    const oldRequest = await repo.create(makeRequest());
    oldRequest.requestedAt = new Date(Date.now() - 3_600_000);

    const count = await expireStaleAnalyses(repo, 600_000);

    expect(count).toBe(1);
    const updated = await repo.findById(oldRequest.id);
    expect(updated?.status).toBe("FAILED");
    expect(updated?.failureReason).toContain("tempo limite");
  });

  it("não expira análises PENDING mais recentes que o threshold", async () => {
    // Análise criada há 1 minuto
    await repo.create(makeRequest());

    const count = await expireStaleAnalyses(repo, 600_000);

    expect(count).toBe(0);
  });

  it("não expira análises que já estão em COMPLETED ou FAILED", async () => {
    const req = await repo.create(makeRequest());
    // marcar como antiga e COMPLETED manualmente
    req.requestedAt = new Date(Date.now() - 3_600_000);
    req.status = "COMPLETED";

    const count = await expireStaleAnalyses(repo, 600_000);
    expect(count).toBe(0);
  });

  it("expira múltiplas análises stale de uma vez", async () => {
    for (let i = 0; i < 3; i++) {
      const req = await repo.create({
        userId: `user-${i}`,
        chain: "ethereum",
        address: `0x${i}`,
      });
      req.requestedAt = new Date(Date.now() - 3_600_000);
    }
    // uma análise recente não deve ser expirada
    await repo.create(makeRequest());

    const count = await expireStaleAnalyses(repo, 600_000);
    expect(count).toBe(3);
  });
});
