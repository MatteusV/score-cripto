import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionInMemoryRepository } from "../../repositories/in-memory/subscription-in-memory-repository";
import { UsageInMemoryRepository } from "../../repositories/in-memory/usage-in-memory-repository";
import { UsageLimitExceededError } from "../errors/usage-limit-exceeded-error";
import { ConsumeUsageUseCase } from "./consume-usage-use-case";

let usageRepo: UsageInMemoryRepository;
let subscriptionRepo: SubscriptionInMemoryRepository;
let sut: ConsumeUsageUseCase;

const USER_ID = "user-1";

async function createSubscription(plan: "FREE_TIER" | "PRO") {
  return subscriptionRepo.create({ userId: USER_ID, plan, status: "active" });
}

async function createUsageRecord(analysisCount: number) {
  const now = new Date();
  return usageRepo.create({
    userId: USER_ID,
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1,
    analysisCount,
    resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  });
}

describe("ConsumeUsageUseCase", () => {
  beforeEach(() => {
    usageRepo = new UsageInMemoryRepository();
    subscriptionRepo = new SubscriptionInMemoryRepository();
    sut = new ConsumeUsageUseCase(usageRepo, subscriptionRepo);
  });

  it("incrementa analysisCount e retorna remaining correto", async () => {
    await createSubscription("FREE_TIER");
    await createUsageRecord(2);

    const result = await sut.execute({ userId: USER_ID });

    expect(result.remaining).toBe(2); // 5 - 3
    expect(result.limit).toBe(5);
    expect(usageRepo.items[0].analysisCount).toBe(3);
  });

  it("cria UsageRecord automaticamente na primeira análise", async () => {
    await createSubscription("FREE_TIER");

    const result = await sut.execute({ userId: USER_ID });

    expect(result.remaining).toBe(4); // 5 - 1
    expect(usageRepo.items).toHaveLength(1);
    expect(usageRepo.items[0].analysisCount).toBe(1);
  });

  it("lança UsageLimitExceededError quando usuário FREE_TIER atingiu o limite", async () => {
    await createSubscription("FREE_TIER");
    await createUsageRecord(5);

    await expect(sut.execute({ userId: USER_ID })).rejects.toThrow(
      UsageLimitExceededError
    );
  });

  it("lança UsageLimitExceededError quando usuário PRO atingiu o limite", async () => {
    await createSubscription("PRO");
    await createUsageRecord(15);

    await expect(sut.execute({ userId: USER_ID })).rejects.toThrow(
      UsageLimitExceededError
    );
  });

  it("usuário PRO pode consumir até 15 análises", async () => {
    await createSubscription("PRO");
    await createUsageRecord(14);

    const result = await sut.execute({ userId: USER_ID });

    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(15);
    expect(usageRepo.items[0].analysisCount).toBe(15);
  });

  it("remaining nunca é negativo", async () => {
    await createSubscription("FREE_TIER");
    await createUsageRecord(4);

    const result = await sut.execute({ userId: USER_ID });

    expect(result.remaining).toBe(0);
  });
});
