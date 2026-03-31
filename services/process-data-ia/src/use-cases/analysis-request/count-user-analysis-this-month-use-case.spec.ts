import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { CountUserAnalysisThisMonthUseCase } from "./count-user-analysis-this-month-use-case";

let repository: AnalysisRequestInMemoryRepository;
let sut: CountUserAnalysisThisMonthUseCase;

describe("Count User Analysis This Month Use Case", () => {
  beforeEach(() => {
    repository = new AnalysisRequestInMemoryRepository();
    sut = new CountUserAnalysisThisMonthUseCase(repository);
  });

  it("should return 0 when user has no analyses this month", async () => {
    const count = await sut.execute({ userId: randomUUID() });

    expect(count).toBe(0);
  });

  it("should count only COMPLETED and FAILED analyses", async () => {
    const userId = randomUUID();
    const now = new Date();

    await repository.create({
      userId,
      chain: "ETH",
      address: "0x1",
      status: "COMPLETED",
      walletContextHash: "hash-1",
      requestedAt: now,
      processingAt: null,
      completedAt: now,
      failedAt: null,
      failureReason: null,
    });

    await repository.create({
      userId,
      chain: "ETH",
      address: "0x2",
      status: "FAILED",
      walletContextHash: "hash-2",
      requestedAt: now,
      processingAt: null,
      completedAt: null,
      failedAt: now,
      failureReason: "AI timeout",
    });

    await repository.create({
      userId,
      chain: "ETH",
      address: "0x3",
      status: "PROCESSING",
      walletContextHash: "hash-3",
      requestedAt: now,
      processingAt: now,
      completedAt: null,
      failedAt: null,
      failureReason: null,
    });

    const count = await sut.execute({ userId });

    expect(count).toBe(2);
  });

  it("should not count analyses from previous months", async () => {
    const userId = randomUUID();
    const now = new Date();
    // Usar dia 15 do mês passado para evitar overflow (ex: 31/03 - 1 mês = 03/03)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    await repository.create({
      userId,
      chain: "ETH",
      address: "0x1",
      status: "COMPLETED",
      walletContextHash: "hash-1",
      requestedAt: lastMonth,
      processingAt: null,
      completedAt: lastMonth,
      failedAt: null,
      failureReason: null,
    });

    const count = await sut.execute({ userId });

    expect(count).toBe(0);
  });

  it("should not count analyses from other users", async () => {
    const userId = randomUUID();
    const otherUserId = randomUUID();
    const now = new Date();

    await repository.create({
      userId: otherUserId,
      chain: "ETH",
      address: "0x1",
      status: "COMPLETED",
      walletContextHash: "hash-1",
      requestedAt: now,
      processingAt: null,
      completedAt: now,
      failedAt: null,
      failureReason: null,
    });

    const count = await sut.execute({ userId });

    expect(count).toBe(0);
  });
});
