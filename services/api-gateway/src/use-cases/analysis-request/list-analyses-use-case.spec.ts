import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository";
import { ListAnalysesUseCase } from "./list-analyses-use-case";

let repo: AnalysisRequestInMemoryRepository;
let sut: ListAnalysesUseCase;

async function createCompleted(
  repo: AnalysisRequestInMemoryRepository,
  userId: string,
  score: number
) {
  const item = await repo.create({ userId, chain: "ethereum", address: `0x${score}` });
  return repo.markCompleted(item.id, {
    score,
    confidence: 0.9,
    reasoning: "test",
    positiveFactors: [],
    riskFactors: [],
    modelVersion: "gpt-4o-mini",
    promptVersion: "v1",
  });
}

describe("ListAnalysesUseCase", () => {
  beforeEach(() => {
    repo = new AnalysisRequestInMemoryRepository();
    sut = new ListAnalysesUseCase(repo);
  });

  it("should return empty data and zero summary when user has no analyses", async () => {
    const result = await sut.execute({ userId: "user-1", page: 1, limit: 20 });

    expect(result.data).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.avgScore).toBe(0);
    expect(result.summary.trusted).toBe(0);
    expect(result.summary.attention).toBe(0);
    expect(result.summary.risky).toBe(0);
    expect(result.pagination.total).toBe(0);
  });

  it("should return only COMPLETED analyses for the user", async () => {
    await createCompleted(repo, "user-1", 80);
    const pending = await repo.create({ userId: "user-1", chain: "ethereum", address: "0xpending" });
    expect(pending.status).toBe("PENDING");

    const result = await sut.execute({ userId: "user-1", page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].score).toBe(80);
  });

  it("should not include analyses from other users", async () => {
    await createCompleted(repo, "user-1", 80);
    await createCompleted(repo, "user-2", 50);

    const result = await sut.execute({ userId: "user-1", page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.summary.total).toBe(1);
  });

  it("should compute summary correctly: trusted>=70, attention 40-69, risky<40", async () => {
    await createCompleted(repo, "user-1", 85); // trusted
    await createCompleted(repo, "user-1", 70); // trusted
    await createCompleted(repo, "user-1", 55); // attention
    await createCompleted(repo, "user-1", 30); // risky

    const result = await sut.execute({ userId: "user-1", page: 1, limit: 20 });

    expect(result.summary.total).toBe(4);
    expect(result.summary.avgScore).toBe(60); // (85+70+55+30)/4 = 60
    expect(result.summary.trusted).toBe(2);
    expect(result.summary.attention).toBe(1);
    expect(result.summary.risky).toBe(1);
  });

  it("should paginate results correctly", async () => {
    for (let i = 0; i < 5; i++) {
      await createCompleted(repo, "user-1", 50 + i);
    }

    const page1 = await sut.execute({ userId: "user-1", page: 1, limit: 3 });
    const page2 = await sut.execute({ userId: "user-1", page: 2, limit: 3 });

    expect(page1.data).toHaveLength(3);
    expect(page2.data).toHaveLength(2);
    expect(page1.pagination).toEqual({ page: 1, limit: 3, total: 5 });
    expect(page2.pagination).toEqual({ page: 2, limit: 3, total: 5 });
  });

  it("should sort results by completedAt descending (most recent first)", async () => {
    const a = await createCompleted(repo, "user-1", 80);
    await new Promise((r) => setTimeout(r, 5));
    const b = await createCompleted(repo, "user-1", 60);

    const result = await sut.execute({ userId: "user-1", page: 1, limit: 20 });

    expect(result.data[0].id).toBe(b.id); // most recent first
    expect(result.data[1].id).toBe(a.id);
  });

  it("summary should aggregate over ALL user analyses, not just the current page", async () => {
    for (let i = 0; i < 5; i++) {
      await createCompleted(repo, "user-1", 80); // all trusted
    }

    const result = await sut.execute({ userId: "user-1", page: 1, limit: 2 });

    // data has only 2 items (page 1), but summary counts all 5
    expect(result.data).toHaveLength(2);
    expect(result.summary.total).toBe(5);
    expect(result.summary.trusted).toBe(5);
  });
});
