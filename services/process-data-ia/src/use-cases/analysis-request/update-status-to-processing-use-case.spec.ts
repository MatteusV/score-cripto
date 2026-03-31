import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";
import { UpdateStatusToProcessingUseCase } from "./update-status-to-processing-use-case";

let analysisRequestRepository: AnalysisRequestInMemoryRepository;
let sut: UpdateStatusToProcessingUseCase;

describe("Update Status to Processing Use Case", () => {
  beforeEach(() => {
    analysisRequestRepository = new AnalysisRequestInMemoryRepository();
    sut = new UpdateStatusToProcessingUseCase(analysisRequestRepository);
  });

  it("should be able to update the status of an analysis request to PROCESSING", async () => {
    const result = await analysisRequestRepository.create({
      userId: randomUUID(),
      chain: "fake-chain",
      address: "fake-address",
      status: "PENDING",
      walletContextHash: "fake-wallet-context-hash",
      requestedAt: new Date(),
      processingAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null,
    });

    if (!result) {
      throw new Error("Failed to create analysis request");
    }

    await sut.execute({
      analysisRequestId: result?.id,
    });

    const updatedResult = await analysisRequestRepository.findById(result.id);
    expect(updatedResult?.status).toBe("PROCESSING");
    expect(updatedResult?.processingAt).toEqual(expect.any(Date));
  });

  it("not should be able to update a non-existent analysis request", async () => {
    await expect(
      sut.execute({
        analysisRequestId: randomUUID(),
      })
    ).rejects.toBeInstanceOf(AnalysisRequestNotFoundError);
  });
});
