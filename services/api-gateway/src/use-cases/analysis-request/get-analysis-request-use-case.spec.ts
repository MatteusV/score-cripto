import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";
import { GetAnalysisRequestUseCase } from "./get-analysis-request-use-case";

let repository: AnalysisRequestInMemoryRepository;
let sut: GetAnalysisRequestUseCase;

describe("Get Analysis Request Use Case", () => {
  beforeEach(() => {
    repository = new AnalysisRequestInMemoryRepository();
    sut = new GetAnalysisRequestUseCase(repository);
  });

  it("deve retornar a analysis request pelo id", async () => {
    const created = await repository.create({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    const { analysisRequest } = await sut.execute({ id: created.id });

    expect(analysisRequest.id).toBe(created.id);
    expect(analysisRequest.userId).toBe("user-1");
  });

  it("deve lançar AnalysisRequestNotFoundError quando id não existe", async () => {
    await expect(sut.execute({ id: "id-inexistente" })).rejects.toThrow(
      AnalysisRequestNotFoundError
    );
  });
});
