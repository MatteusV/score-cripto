import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { AnalysisRequestIsNotProcessingError } from "../errors/analysis-request-is-not-processing-error";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";
import { UpdateStatusToFailedUseCase } from "./update-status-to-failed-use-case";

let analysisRequestRepository: AnalysisRequestInMemoryRepository;
let sut: UpdateStatusToFailedUseCase;

describe("Update Status to Failed Use Case", () => {
  beforeEach(() => {
    analysisRequestRepository = new AnalysisRequestInMemoryRepository();
    sut = new UpdateStatusToFailedUseCase(analysisRequestRepository);
  });

  it("should be able to update the status of an analysis request to FAILED", async () => {
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

    const failureReason = "API call failed";
    await sut.execute({
      analysisRequestId: result.id,
      failureReason,
    });

    const updatedResult = await analysisRequestRepository.findById(result.id);
    expect(updatedResult?.status).toBe("FAILED");
    expect(updatedResult?.failedAt).toEqual(expect.any(Date));
    expect(updatedResult?.failureReason).toBe(failureReason);
  });

  it("not should be able to update a non-existent analysis request", async () => {
    await expect(
      sut.execute({
        analysisRequestId: randomUUID(),
        failureReason: "Test failure",
      })
    ).rejects.toBeInstanceOf(AnalysisRequestNotFoundError);
  });

  it("not should be able to update a failed analysis request", async () => {
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
      failureReason: "First failure",
    });

    await expect(
      sut.execute({
        analysisRequestId: result.id,
        failureReason: "Second failure",
      })
    ).rejects.toBeInstanceOf(AnalysisRequestIsNotProcessingError);
  });

  it("not should be possible to update a status to failed if it is not in process", async () => {
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
        failureReason: "Cannot fail PENDING request",
      })
    ).rejects.toBeInstanceOf(AnalysisRequestIsNotProcessingError);
  });
});
