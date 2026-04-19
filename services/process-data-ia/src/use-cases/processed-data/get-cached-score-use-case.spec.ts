import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessedDataInMemoryRepository } from "../../repositories/in-memory/processed-data-in-memory-repository.js";
import { GetCachedScoreUseCase } from "./get-cached-score-use-case.js";

let repository: ProcessedDataInMemoryRepository;
let sut: GetCachedScoreUseCase;

const BASE_ITEM = {
  userId: randomUUID(),
  chain: "ETH",
  address: "0xabc",
  walletContextHash: "hash-123",
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
};

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
      ...BASE_ITEM,
      analysisRequestId: randomUUID(),
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
      ...BASE_ITEM,
      analysisRequestId: randomUUID(),
      validUntil: expiredValidUntil,
    });

    const result = await sut.execute({
      chain: "ETH",
      address: "0xabc",
      walletContextHash: "hash-123",
    });

    expect(result).toBeNull();
  });

  it("should return null for same wallet but different walletContextHash", async () => {
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    await repository.create({
      ...BASE_ITEM,
      analysisRequestId: randomUUID(),
      walletContextHash: "hash-original",
      score: 70,
      validUntil,
    });

    const result = await sut.execute({
      chain: "ETH",
      address: "0xabc",
      walletContextHash: "hash-different-context",
    });

    expect(result).toBeNull();
  });

  it("should return the most recent valid score when multiple exist", async () => {
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    vi.useFakeTimers();

    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    await repository.create({
      ...BASE_ITEM,
      analysisRequestId: randomUUID(),
      score: 60,
      reasoning: "Older score",
      validUntil,
    });

    vi.setSystemTime(new Date("2024-01-01T01:00:00Z"));
    await repository.create({
      ...BASE_ITEM,
      analysisRequestId: randomUUID(),
      score: 85,
      reasoning: "Newer score",
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
