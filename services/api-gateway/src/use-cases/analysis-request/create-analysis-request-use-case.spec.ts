import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository.js";
import { CreateAnalysisRequestUseCase } from "./create-analysis-request-use-case.js";

let repository: AnalysisRequestInMemoryRepository;
let sut: CreateAnalysisRequestUseCase;

describe("Create Analysis Request Use Case", () => {
  beforeEach(() => {
    repository = new AnalysisRequestInMemoryRepository();
    sut = new CreateAnalysisRequestUseCase(repository);
  });

  it("deve criar uma analysis request com status PENDING", async () => {
    const { analysisRequest } = await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(analysisRequest.id).toEqual(expect.any(String));
    expect(analysisRequest.status).toBe("PENDING");
    expect(analysisRequest.userId).toBe("user-1");
    expect(analysisRequest.chain).toBe("ethereum");
    expect(analysisRequest.address).toBe("0xabc");
  });

  it("deve persistir a request no repositório", async () => {
    await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(repository.items).toHaveLength(1);
  });

  it("deve definir requestedAt automaticamente", async () => {
    const before = new Date();

    const { analysisRequest } = await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(analysisRequest.requestedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
  });
});
