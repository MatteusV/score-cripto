import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";
import { CompleteAnalysisRequestUseCase } from "./complete-analysis-request-use-case";

let repository: AnalysisRequestInMemoryRepository;
let sut: CompleteAnalysisRequestUseCase;

const RESULT = {
  score: 85,
  confidence: 0.9,
  reasoning: "Wallet com histórico sólido",
  positiveFactors: ["Carteira antiga", "Muitos counterparties"],
  riskFactors: [],
  modelVersion: "gpt-4o-mini",
  promptVersion: "v1.0",
};

describe("Complete Analysis Request Use Case", () => {
  beforeEach(() => {
    repository = new AnalysisRequestInMemoryRepository();
    sut = new CompleteAnalysisRequestUseCase(repository);
  });

  it("deve marcar request como COMPLETED com resultado", async () => {
    const created = await repository.create({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    const { analysisRequest } = await sut.execute({
      id: created.id,
      result: RESULT,
    });

    expect(analysisRequest.status).toBe("COMPLETED");
    expect(analysisRequest.score).toBe(85);
    expect(analysisRequest.confidence).toBe(0.9);
    expect(analysisRequest.reasoning).toBe("Wallet com histórico sólido");
    expect(analysisRequest.completedAt).toBeInstanceOf(Date);
  });

  it("deve persistir os positiveFactors e riskFactors", async () => {
    const created = await repository.create({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    const { analysisRequest } = await sut.execute({
      id: created.id,
      result: RESULT,
    });

    expect(analysisRequest.positiveFactors).toEqual([
      "Carteira antiga",
      "Muitos counterparties",
    ]);
    expect(analysisRequest.riskFactors).toEqual([]);
  });

  it("deve lançar AnalysisRequestNotFoundError quando id não existe", async () => {
    await expect(
      sut.execute({ id: "id-inexistente", result: RESULT })
    ).rejects.toThrow(AnalysisRequestNotFoundError);
  });
});
