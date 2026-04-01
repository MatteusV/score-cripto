import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { ProcessedDataInMemoryRepository } from "../../repositories/in-memory/processed-data-in-memory-repository";
import { ProcessedDataNotFoundError } from "../errors/processed-data-not-found-error";
import { GetScoreByProcessIdUseCase } from "./get-score-by-process-id-use-case";

let repository: ProcessedDataInMemoryRepository;
let sut: GetScoreByProcessIdUseCase;

describe("Get Score By Process ID Use Case", () => {
  beforeEach(() => {
    repository = new ProcessedDataInMemoryRepository();
    sut = new GetScoreByProcessIdUseCase(repository);
  });

  it("should return processed data when it exists", async () => {
    const analysisRequestId = randomUUID();
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    await repository.create({
      analysisRequestId,
      userId: randomUUID(),
      chain: "ETH",
      address: "0xabc",
      walletContextHash: "hash-abc",
      score: 88,
      confidence: 0.92,
      reasoning: "Trustworthy wallet",
      positiveFactors: ["Long history"],
      riskFactors: [],
      modelVersion: "gpt-4o-mini",
      promptVersion: "v1.0",
      tokensUsed: 450,
      cost: 0.000_09,
      inferenceDurationMs: 1050,
      validUntil,
    });

    const { processedData } = await sut.execute({
      processId: analysisRequestId,
    });

    expect(processedData.analysisRequestId).toBe(analysisRequestId);
    expect(processedData.score).toBe(88);
    expect(processedData.validUntil).toEqual(validUntil);
  });

  it("should throw ProcessedDataNotFoundError when processId does not exist", async () => {
    await expect(
      sut.execute({ processId: randomUUID() })
    ).rejects.toBeInstanceOf(ProcessedDataNotFoundError);
  });
});
