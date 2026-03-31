import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { AnalysisRequestAlreadyExistsError } from "../errors/analysis-request-already-exists-error";
import { CreateAnalysisRequestUseCase } from "./create-analysis-request-use-case";

let analysisRequestRepository: AnalysisRequestInMemoryRepository;
let sut: CreateAnalysisRequestUseCase;

describe("Create Analysis Request Use Case", () => {
  beforeEach(() => {
    analysisRequestRepository = new AnalysisRequestInMemoryRepository();
    sut = new CreateAnalysisRequestUseCase(analysisRequestRepository);
  });

  it("should be able to create a new analysis request", async () => {
    const { analysisRequest } = await sut.execute({
      address: "fake-address",
      chain: "fake-chain",
      userId: randomUUID(),
      walletContextHash: "fake-wallet-context-hash",
    });

    expect(analysisRequest.id).toEqual(expect.any(String));
    expect(analysisRequest.status).toEqual("PENDING");
    expect(analysisRequest.requestedAt).toEqual(expect.any(Date));
  });

  it("not should be able to register the same analysis request twice", async () => {
    const userId = randomUUID();
    await sut.execute({
      address: "fake-address",
      chain: "fake-chain",
      userId,
      walletContextHash: "fake-wallet-context-hash",
    });

    await expect(
      sut.execute({
        address: "fake-address",
        chain: "fake-chain",
        userId,
        walletContextHash: "fake-wallet-context-hash",
      })
    ).rejects.toBeInstanceOf(AnalysisRequestAlreadyExistsError);
  });
});
