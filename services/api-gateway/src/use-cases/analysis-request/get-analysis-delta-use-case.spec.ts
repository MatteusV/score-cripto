import { beforeEach, describe, expect, it } from "vitest";
import { AnalysisRequestInMemoryRepository } from "../../repositories/in-memory/analysis-request-in-memory-repository.js";
import { GetAnalysisDeltaUseCase } from "./get-analysis-delta-use-case.js";

let repo: AnalysisRequestInMemoryRepository;
let sut: GetAnalysisDeltaUseCase;

const NOW = new Date("2026-04-19T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

async function seedCompleted(userId: string, score: number, completedAt: Date) {
  const item = await repo.create({
    userId,
    chain: "ethereum",
    address: `0x${score}-${completedAt.getTime()}`,
  });
  await repo.markCompleted(item.id, {
    score,
    confidence: 0.9,
    reasoning: "test",
    positiveFactors: [],
    riskFactors: [],
    modelVersion: "gpt-4o-mini",
    promptVersion: "v1",
  });
  // Override the auto-stamped completedAt so we can place items in
  // arbitrary time windows for the delta tests.
  const stored = repo.items.find((it) => it.id === item.id);
  if (stored) {
    stored.completedAt = completedAt;
  }
}

describe("GetAnalysisDeltaUseCase", () => {
  beforeEach(() => {
    repo = new AnalysisRequestInMemoryRepository();
    sut = new GetAnalysisDeltaUseCase(repo);
  });

  it("returns zero delta when user has no analyses in either window", async () => {
    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(0);
    expect(result.previous.total).toBe(0);
    expect(result.delta).toEqual({
      total: 0,
      avgScore: 0,
      trusted: 0,
      attention: 0,
      risky: 0,
    });
  });

  it("places items in current window when completedAt is within last N days", async () => {
    // 3 days ago — current window for days=7
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 3 * DAY));

    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(1);
    expect(result.previous.total).toBe(0);
    expect(result.delta.total).toBe(1);
  });

  it("places items in previous window when completedAt is in [N, 2N] days ago", async () => {
    // 10 days ago — previous window for days=7
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 10 * DAY));

    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(0);
    expect(result.previous.total).toBe(1);
    expect(result.delta.total).toBe(-1);
  });

  it("excludes items older than 2*days (out of both windows)", async () => {
    // 20 days ago — outside both windows for days=7
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 20 * DAY));

    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(0);
    expect(result.previous.total).toBe(0);
  });

  it("computes delta = current - previous for every metric", async () => {
    // Current window: 1 trusted (80), 1 attention (50), 1 risky (20)
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 2 * DAY));
    await seedCompleted("user-1", 50, new Date(NOW.getTime() - 4 * DAY));
    await seedCompleted("user-1", 20, new Date(NOW.getTime() - 6 * DAY));
    // Previous window: 2 trusted (90, 70)
    await seedCompleted("user-1", 90, new Date(NOW.getTime() - 9 * DAY));
    await seedCompleted("user-1", 70, new Date(NOW.getTime() - 11 * DAY));

    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(3);
    expect(result.current.trusted).toBe(1);
    expect(result.current.attention).toBe(1);
    expect(result.current.risky).toBe(1);
    expect(result.current.avgScore).toBe(50); // (80+50+20)/3

    expect(result.previous.total).toBe(2);
    expect(result.previous.trusted).toBe(2);
    expect(result.previous.avgScore).toBe(80); // (90+70)/2

    expect(result.delta.total).toBe(1);
    expect(result.delta.trusted).toBe(-1);
    expect(result.delta.attention).toBe(1);
    expect(result.delta.risky).toBe(1);
    expect(result.delta.avgScore).toBe(-30);
  });

  it("does not include analyses from other users in either window", async () => {
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 2 * DAY));
    await seedCompleted("user-2", 80, new Date(NOW.getTime() - 2 * DAY));
    await seedCompleted("user-2", 80, new Date(NOW.getTime() - 10 * DAY));

    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(1);
    expect(result.previous.total).toBe(0);
  });

  it("excludes non-COMPLETED analyses (PENDING / FAILED)", async () => {
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 2 * DAY));
    // Bare create stays PENDING
    await repo.create({ userId: "user-1", chain: "eth", address: "0xpend" });

    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(1);
  });

  it("returns half-open windows so boundary items land in the newer window only (no double-count)", async () => {
    // Boundary instant: exactly N days ago. Both windows use [from, to)
    // so the item at currentFrom = previousTo is included in CURRENT
    // (gte) and excluded from PREVIOUS (lt). Critical: never double-counted.
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 7 * DAY));

    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.current.total).toBe(1);
    expect(result.previous.total).toBe(0);
    expect(result.current.total + result.previous.total).toBe(1);
  });

  it("respects custom days parameter (e.g. 30)", async () => {
    // 20 days ago — current window for days=30
    await seedCompleted("user-1", 80, new Date(NOW.getTime() - 20 * DAY));
    // 50 days ago — previous window for days=30 ([30, 60])
    await seedCompleted("user-1", 50, new Date(NOW.getTime() - 50 * DAY));

    const result = await sut.execute({ userId: "user-1", days: 30, now: NOW });

    expect(result.current.total).toBe(1);
    expect(result.previous.total).toBe(1);
    expect(result.delta.total).toBe(0);
    expect(result.delta.avgScore).toBe(30);
  });

  it("returns window metadata with correct from/to instants", async () => {
    const result = await sut.execute({ userId: "user-1", days: 7, now: NOW });

    expect(result.window.days).toBe(7);
    expect(result.window.current.to.getTime()).toBe(NOW.getTime());
    expect(result.window.current.from.getTime()).toBe(NOW.getTime() - 7 * DAY);
    expect(result.window.previous.to.getTime()).toBe(NOW.getTime() - 7 * DAY);
    expect(result.window.previous.from.getTime()).toBe(
      NOW.getTime() - 14 * DAY
    );
  });
});
