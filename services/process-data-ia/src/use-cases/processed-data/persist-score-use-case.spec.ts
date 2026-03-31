import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { ProcessedDataInMemoryRepository } from "../../repositories/in-memory/processed-data-in-memory-repository";
import { PersistScoreUseCase } from "./persist-score-use-case";

let repository: ProcessedDataInMemoryRepository;
let sut: PersistScoreUseCase;

const SCORE_VALIDITY_HOURS = 24;

describe("Persist Score Use Case", () => {
  beforeEach(() => {
    repository = new ProcessedDataInMemoryRepository();
    sut = new PersistScoreUseCase(repository, SCORE_VALIDITY_HOURS);
  });

  it("should persist a score with all required fields", async () => {
    const analysisRequestId = randomUUID();
    const userId = randomUUID();

    const { processedData } = await sut.execute({
      analysisRequestId,
      userId,
      chain: "ETH",
      address: "0xabc",
      score: 78,
      confidence: 0.85,
      reasoning: "Solid wallet with good history",
      positiveFactors: ["Old wallet", "Many counterparties"],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 420,
      cost: 0.000_08,
      inferenceDurationMs: 1100,
    });

    expect(processedData.id).toEqual(expect.any(String));
    expect(processedData.score).toBe(78);
    expect(processedData.confidence).toBe(0.85);
    expect(processedData.analysisRequestId).toBe(analysisRequestId);
    expect(processedData.userId).toBe(userId);
  });

  it("should set validUntil based on scoreValidityHours", async () => {
    const before = new Date();

    const { processedData } = await sut.execute({
      analysisRequestId: randomUUID(),
      userId: randomUUID(),
      chain: "ETH",
      address: "0xabc",
      score: 50,
      confidence: 0.6,
      reasoning: "Average wallet",
      positiveFactors: [],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 300,
      cost: 0.000_05,
      inferenceDurationMs: 900,
    });

    const expectedValidUntil = new Date(before);
    expectedValidUntil.setHours(
      expectedValidUntil.getHours() + SCORE_VALIDITY_HOURS
    );

    expect(processedData.validUntil.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(processedData.validUntil.getTime()).toBeLessThanOrEqual(
      expectedValidUntil.getTime() + 1000
    );
  });

  it("should set createdAt automatically", async () => {
    const before = new Date();

    const { processedData } = await sut.execute({
      analysisRequestId: randomUUID(),
      userId: randomUUID(),
      chain: "ETH",
      address: "0xabc",
      score: 60,
      confidence: 0.7,
      reasoning: "OK wallet",
      positiveFactors: [],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 350,
      cost: 0.000_06,
      inferenceDurationMs: 950,
    });

    expect(processedData.createdAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
  });
});
