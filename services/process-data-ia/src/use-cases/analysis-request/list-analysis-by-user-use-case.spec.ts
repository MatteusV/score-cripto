import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { ListAnalysisByUserUseCase } from "./list-analysis-by-user-use-case";

let repository: AnalysisRequestInMemoryRepository;
let sut: ListAnalysisByUserUseCase;

describe("List Analysis By User Use Case", () => {
  beforeEach(() => {
    repository = new AnalysisRequestInMemoryRepository();
    sut = new ListAnalysisByUserUseCase(repository);
  });

  it("should return an empty list when user has no analyses", async () => {
    const { items, total } = await sut.execute({
      userId: randomUUID(),
      page: 1,
      limit: 20,
    });

    expect(items).toHaveLength(0);
    expect(total).toBe(0);
  });

  it("should list only analyses belonging to the user", async () => {
    const userId = randomUUID();
    const otherUserId = randomUUID();

    await repository.create({
      userId,
      chain: "ETH",
      address: "0xabc",
      status: "COMPLETED",
      walletContextHash: "hash-1",
      requestedAt: new Date(),
      processingAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null,
    });

    await repository.create({
      userId: otherUserId,
      chain: "ETH",
      address: "0xdef",
      status: "COMPLETED",
      walletContextHash: "hash-2",
      requestedAt: new Date(),
      processingAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null,
    });

    const { items, total } = await sut.execute({ userId, page: 1, limit: 20 });

    expect(items).toHaveLength(1);
    expect(total).toBe(1);
    expect(items[0].userId).toBe(userId);
  });

  it("should return analyses in descending order by requestedAt", async () => {
    const userId = randomUUID();

    await repository.create({
      userId,
      chain: "ETH",
      address: "0xabc",
      status: "COMPLETED",
      walletContextHash: "hash-1",
      requestedAt: new Date("2024-01-01"),
      processingAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null,
    });

    await repository.create({
      userId,
      chain: "ETH",
      address: "0xdef",
      status: "COMPLETED",
      walletContextHash: "hash-2",
      requestedAt: new Date("2024-03-01"),
      processingAt: null,
      completedAt: null,
      failedAt: null,
      failureReason: null,
    });

    const { items } = await sut.execute({ userId, page: 1, limit: 20 });

    expect(items[0].requestedAt.getTime()).toBeGreaterThan(
      items[1].requestedAt.getTime()
    );
  });

  it("should paginate correctly", async () => {
    const userId = randomUUID();

    for (let i = 0; i < 5; i++) {
      await repository.create({
        userId,
        chain: "ETH",
        address: `0x${i}`,
        status: "COMPLETED",
        walletContextHash: `hash-${i}`,
        requestedAt: new Date(),
        processingAt: null,
        completedAt: null,
        failedAt: null,
        failureReason: null,
      });
    }

    const page1 = await sut.execute({ userId, page: 1, limit: 2 });
    const page2 = await sut.execute({ userId, page: 2, limit: 2 });

    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page1.total).toBe(5);
  });

  it("should cap limit at 100", async () => {
    const userId = randomUUID();

    const { items } = await sut.execute({ userId, page: 1, limit: 200 });

    expect(items).toHaveLength(0);
  });
});
