import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";
import { GetAnalysisByIdUseCase } from "./get-analysis-by-id-use-case";

let analysisRequestRepository: AnalysisRequestInMemoryRepository;
let sut: GetAnalysisByIdUseCase;

describe("Get Analysis By Id Use Case", () => {
  beforeEach(() => {
    analysisRequestRepository = new AnalysisRequestInMemoryRepository();
    sut = new GetAnalysisByIdUseCase(analysisRequestRepository);
  });

  it("should be able to get an analysis request by id", async () => {
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

    const { analysisRequest } = await sut.execute({
      analysisRequestId: result.id,
    });

    expect(analysisRequest.id).toBe(result.id);
    expect(analysisRequest.chain).toBe("fake-chain");
    expect(analysisRequest.address).toBe("fake-address");
    expect(analysisRequest.status).toBe("PENDING");
  });

  it("not should be able to get a non-existent analysis request", async () => {
    await expect(
      sut.execute({
        analysisRequestId: randomUUID(),
      })
    ).rejects.toBeInstanceOf(AnalysisRequestNotFoundError);
  });
});
