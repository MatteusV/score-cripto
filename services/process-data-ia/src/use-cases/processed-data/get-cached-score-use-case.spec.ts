import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessedDataInMemoryRepository } from "../../repositories/in-memory/processed-data-in-memory-repository";
import { GetCachedScoreUseCase } from "./get-cached-score-use-case";

let repository: ProcessedDataInMemoryRepository;
let sut: GetCachedScoreUseCase;

describe("Get Cached Score Use Case", () => {
  beforeEach(() => {
    repository = new ProcessedDataInMemoryRepository();
    sut = new GetCachedScoreUseCase(repository);
  });

  it("should return null when no cached score exists", async () => {
    const result = await sut.execute({
      chain: "ETH",
      address: "0xabc",
      walletContextHash: "hash-123",
    });

    expect(result).toBeNull();
  });

  it("should return cached score when valid (validUntil > now)", async () => {
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    await repository.create({
      analysisRequestId: randomUUID(),
      userId: randomUUID(),
      chain: "ETH",
      address: "0xabc",
      score: 75,
      confidence: 0.9,
      reasoning: "Good wallet",
      positiveFactors: ["Old wallet", "High tx count"],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 500,
      cost: 0.0001,
      inferenceDurationMs: 1200,
      validUntil,
    });

    const result = await sut.execute({
      chain: "ETH",
      address: "0xabc",
      walletContextHash: "hash-123",
    });

    expect(result).not.toBeNull();
    expect(result?.score).toBe(75);
  });

  it("should return null when score is expired (validUntil < now)", async () => {
    const expiredValidUntil = new Date();
    expiredValidUntil.setHours(expiredValidUntil.getHours() - 1);

    await repository.create({
      analysisRequestId: randomUUID(),
      userId: randomUUID(),
      chain: "ETH",
      address: "0xabc",
      score: 75,
      confidence: 0.9,
      reasoning: "Good wallet",
      positiveFactors: [],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 500,
      cost: 0.0001,
      inferenceDurationMs: 1200,
      validUntil: expiredValidUntil,
    });

    const result = await sut.execute({
      chain: "ETH",
      address: "0xabc",
      walletContextHash: "hash-123",
    });

    expect(result).toBeNull();
  });

  it("should return the most recent valid score when multiple exist", async () => {
    const userId = randomUUID();
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    vi.useFakeTimers();

    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    await repository.create({
      analysisRequestId: randomUUID(),
      userId,
      chain: "ETH",
      address: "0xabc",
      score: 60,
      confidence: 0.7,
      reasoning: "Older score",
      positiveFactors: [],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 400,
      cost: 0.0001,
      inferenceDurationMs: 1000,
      validUntil,
    });

    vi.setSystemTime(new Date("2024-01-01T01:00:00Z"));
    await repository.create({
      analysisRequestId: randomUUID(),
      userId,
      chain: "ETH",
      address: "0xabc",
      score: 85,
      confidence: 0.95,
      reasoning: "Newer score",
      positiveFactors: [],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 500,
      cost: 0.0001,
      inferenceDurationMs: 1100,
      validUntil,
    });

    vi.useRealTimers();

    const result = await sut.execute({
      chain: "ETH",
      address: "0xabc",
      walletContextHash: "hash-123",
    });

    expect(result?.score).toBe(85);
  });
});
