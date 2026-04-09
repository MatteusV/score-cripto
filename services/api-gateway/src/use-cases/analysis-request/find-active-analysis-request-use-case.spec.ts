import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { FindActiveAnalysisRequestUseCase } from "./find-active-analysis-request-use-case";

let repository: AnalysisRequestInMemoryRepository;
let sut: FindActiveAnalysisRequestUseCase;

describe("Find Active Analysis Request Use Case", () => {
  beforeEach(() => {
    repository = new AnalysisRequestInMemoryRepository();
    sut = new FindActiveAnalysisRequestUseCase(repository);
  });

  it("deve retornar null quando não há request ativa", async () => {
    const result = await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(result).toBeNull();
  });

  it("deve retornar request com status PENDING", async () => {
    await repository.create({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    const result = await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe("PENDING");
  });

  it("deve retornar request com status PROCESSING", async () => {
    const created = await repository.create({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    const index = repository.items.findIndex((i) => i.id === created.id);
    repository.items[index] = {
      ...repository.items[index],
      status: "PROCESSING",
    };

    const result = await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(result?.status).toBe("PROCESSING");
  });

  it("deve retornar null quando request está COMPLETED", async () => {
    const created = await repository.create({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    const index = repository.items.findIndex((i) => i.id === created.id);
    repository.items[index] = {
      ...repository.items[index],
      status: "COMPLETED",
    };

    const result = await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(result).toBeNull();
  });

  it("não deve retornar request de outro usuário", async () => {
    await repository.create({
      userId: "user-2",
      chain: "ethereum",
      address: "0xabc",
    });

    const result = await sut.execute({
      userId: "user-1",
      chain: "ethereum",
      address: "0xabc",
    });

    expect(result).toBeNull();
  });
});
