import { beforeEach, describe, expect, it } from "vitest";
import { DefaultPlanPolicy } from "../../domain/plan-policy";
import { SubscriptionInMemoryRepository } from "../../repositories/in-memory/subscription-in-memory-repository";
import { UsageInMemoryRepository } from "../../repositories/in-memory/usage-in-memory-repository";
import { CheckUsageUseCase } from "./check-usage-use-case";

let usageRepo: UsageInMemoryRepository;
let subscriptionRepo: SubscriptionInMemoryRepository;
let sut: CheckUsageUseCase;

const USER_ID = "user-1";

async function createSubscription(plan: "FREE_TIER" | "PRO") {
  return subscriptionRepo.create({ userId: USER_ID, plan, status: "active" });
}

async function createUsageRecord(analysisCount: number, resetAt?: Date) {
  const now = new Date();
  return usageRepo.create({
    userId: USER_ID,
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1,
    analysisCount,
    resetAt: resetAt ?? new Date(now.getFullYear(), now.getMonth() + 1, 1),
  });
}

describe("CheckUsageUseCase", () => {
  beforeEach(() => {
    usageRepo = new UsageInMemoryRepository();
    subscriptionRepo = new SubscriptionInMemoryRepository();
    sut = new CheckUsageUseCase(
      usageRepo,
      subscriptionRepo,
      new DefaultPlanPolicy()
    );
  });

  it("usuário FREE_TIER dentro do limite → allowed=true, remaining correto", async () => {
    await createSubscription("FREE_TIER");
    await createUsageRecord(3);

    const result = await sut.execute({ userId: USER_ID });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(2);
  });

  it("usuário FREE_TIER no limite → allowed=false, remaining=0", async () => {
    await createSubscription("FREE_TIER");
    await createUsageRecord(5);

    const result = await sut.execute({ userId: USER_ID });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("usuário PRO dentro do limite → allowed=true, limit=15", async () => {
    await createSubscription("PRO");
    await createUsageRecord(10);

    const result = await sut.execute({ userId: USER_ID });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(15);
    expect(result.remaining).toBe(5);
  });

  it("cria UsageRecord automaticamente se não existir", async () => {
    await createSubscription("FREE_TIER");

    const result = await sut.execute({ userId: USER_ID });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(usageRepo.items).toHaveLength(1);
  });

  it("reseta contador automaticamente quando resetAt já passou", async () => {
    await createSubscription("FREE_TIER");
    // resetAt no passado simula mês que virou
    const pastResetAt = new Date(Date.now() - 1000);
    await createUsageRecord(5, pastResetAt);

    const result = await sut.execute({ userId: USER_ID });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("retorna resetsAt corretamente (dia 1 do próximo mês)", async () => {
    await createSubscription("FREE_TIER");

    const result = await sut.execute({ userId: USER_ID });

    const now = new Date();
    const expectedReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    expect(result.resetsAt.getTime()).toBe(expectedReset.getTime());
  });

  it("usa FREE_TIER como padrão quando não há subscription", async () => {
    const result = await sut.execute({ userId: USER_ID });

    expect(result.limit).toBe(5);
    expect(result.allowed).toBe(true);
  });
});
