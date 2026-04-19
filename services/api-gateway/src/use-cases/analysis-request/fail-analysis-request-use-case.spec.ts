import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository.js";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error.js";
import { FailAnalysisRequestUseCase } from "./fail-analysis-request-use-case.js";

let repository: AnalysisRequestInMemoryRepository;
let sut: FailAnalysisRequestUseCase;

describe("Fail Analysis Request Use Case", () => {
  beforeEach(() => {
    repository = new AnalysisRequestInMemoryRepository();
    sut = new FailAnalysisRequestUseCase(repository);
  });

  it("deve marcar request como FAILED com o motivo", async () => {
    const created = await repository.create({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    const { analysisRequest } = await sut.execute({
      id: created.id,
      reason: "AI service unavailable",
    });

    expect(analysisRequest.status).toBe("FAILED");
    expect(analysisRequest.failureReason).toBe("AI service unavailable");
    expect(analysisRequest.failedAt).toBeInstanceOf(Date);
  });

  it("deve lançar AnalysisRequestNotFoundError quando id não existe", async () => {
    await expect(
      sut.execute({ id: "id-inexistente", reason: "timeout" })
    ).rejects.toThrow(AnalysisRequestNotFoundError);
  });
});
