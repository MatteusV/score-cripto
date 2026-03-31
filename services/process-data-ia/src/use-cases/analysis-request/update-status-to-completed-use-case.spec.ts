import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { AnalysisRequestIsNotProcessingError } from "../errors/analysis-request-is-not-processing-error";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";
import { UpdateStatusToCompletedUseCase } from "./update-status-to-completed-use-case";

let analysisRequestRepository: AnalysisRequestInMemoryRepository;
let sut: UpdateStatusToCompletedUseCase;

describe("Update Status to Completed Use Case", () => {
  beforeEach(() => {
    analysisRequestRepository = new AnalysisRequestInMemoryRepository();
    sut = new UpdateStatusToCompletedUseCase(analysisRequestRepository);
  });

  it("should be able to update the status of an analysis request to COMPLETED", async () => {
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
      throw new AnalysisRequestNotFoundError();
    }

    await analysisRequestRepository.update(result.id, {
      status: "PROCESSING",
      processingAt: new Date(),
    });

    await sut.execute({
      analysisRequestId: result?.id,
    });

    const updatedResult = await analysisRequestRepository.findById(result.id);
    expect(updatedResult?.status).toBe("COMPLETED");
    expect(updatedResult?.completedAt).toEqual(expect.any(Date));
  });

  it("not should be able to update a non-existent analysis request", async () => {
    await expect(
      sut.execute({
        analysisRequestId: randomUUID(),
      })
    ).rejects.toBeInstanceOf(AnalysisRequestNotFoundError);
  });

  it("not should be able to update a completed analysis request", async () => {
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
      throw new AnalysisRequestNotFoundError();
    }

    await analysisRequestRepository.update(result.id, {
      status: "PROCESSING",
      processingAt: new Date(),
    });

    await sut.execute({
      analysisRequestId: result.id,
    });

    await expect(
      sut.execute({
        analysisRequestId: result.id,
      })
    ).rejects.toBeInstanceOf(AnalysisRequestIsNotProcessingError);
  });

  it("not should be possible to update a status to completed if it is not in process.", async () => {
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
      throw new AnalysisRequestNotFoundError();
    }

    await expect(
      sut.execute({
        analysisRequestId: result.id,
      })
    ).rejects.toBeInstanceOf(AnalysisRequestIsNotProcessingError);
  });
});
