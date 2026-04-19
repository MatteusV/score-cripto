import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultPlanPolicy } from "../domain/plan-policy.js";
import { SubscriptionInMemoryRepository } from "../repositories/in-memory/subscription-in-memory-repository.js";
import { UsageInMemoryRepository } from "../repositories/in-memory/usage-in-memory-repository.js";
import { UserInMemoryRepository } from "../repositories/in-memory/user-in-memory-repository.js";
import { ConsumeUsageUseCase } from "../use-cases/usage/consume-usage-use-case.js";
import { processUserAnalysisConsumedMessage } from "./user-analysis-consumer.js";

// Mocka a factory para injetar repos in-memory
vi.mock("../use-cases/factories/make-consume-usage-use-case.js", () => ({
  makeConsumeUsageUseCase: () => consumeUseCase,
}));

let usageRepo: UsageInMemoryRepository;
let subscriptionRepo: SubscriptionInMemoryRepository;
let userRepo: UserInMemoryRepository;
let consumeUseCase: ConsumeUsageUseCase;

function makeValidEvent(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    event: "user.analysis.consumed",
    timestamp: new Date().toISOString(),
    data: {
      userId: "user-1",
      analysisId: "analysis-1",
      status: "completed",
      chain: "ETH",
      address: "0xabc",
      ...overrides,
    },
  });
}

describe("processUserAnalysisConsumedMessage", () => {
  beforeEach(() => {
    usageRepo = new UsageInMemoryRepository();
    subscriptionRepo = new SubscriptionInMemoryRepository();
    userRepo = new UserInMemoryRepository();
    consumeUseCase = new ConsumeUsageUseCase(
      usageRepo,
      subscriptionRepo,
      userRepo,
      new DefaultPlanPolicy()
    );
    vi.clearAllMocks();
  });

  it("processa evento válido e incrementa usage", async () => {
    await userRepo.create({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed",
      role: "USER",
    });
    await subscriptionRepo.create({
      userId: "user-1",
      plan: "FREE_TIER",
      status: "active",
    });

    const result = await processUserAnalysisConsumedMessage(makeValidEvent());

    expect(result.outcome).toBe("processed");
    expect(usageRepo.items[0]?.analysisCount).toBe(1);
  });

  it("retorna invalid_payload para JSON inválido", async () => {
    const result = await processUserAnalysisConsumedMessage("not-json");

    expect(result.outcome).toBe("invalid_payload");
  });

  it("retorna invalid_payload para payload com campos ausentes", async () => {
    const raw = JSON.stringify({
      event: "user.analysis.consumed",
      timestamp: new Date().toISOString(),
      data: { userId: "user-1" }, // faltam campos obrigatórios
    });

    const result = await processUserAnalysisConsumedMessage(raw);

    expect(result.outcome).toBe("invalid_payload");
  });

  it("retorna invalid_payload para event type errado", async () => {
    const raw = JSON.stringify({
      event: "wallet.data.cached",
      timestamp: new Date().toISOString(),
      data: {
        userId: "user-1",
        analysisId: "a-1",
        status: "completed",
        chain: "ETH",
        address: "0xabc",
      },
    });

    const result = await processUserAnalysisConsumedMessage(raw);

    expect(result.outcome).toBe("invalid_payload");
  });

  it("não incrementa usage para análise com status failed", async () => {
    await userRepo.create({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed",
      role: "USER",
    });
    await subscriptionRepo.create({
      userId: "user-1",
      plan: "FREE_TIER",
      status: "active",
    });

    const result = await processUserAnalysisConsumedMessage(
      makeValidEvent({ status: "failed" })
    );

    expect(result.outcome).toBe("processed");
    expect(usageRepo.items).toHaveLength(0); // não consumiu
  });

  it("retorna limit_exceeded sem erro quando limite já atingido", async () => {
    const now = new Date();
    await userRepo.create({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed",
      role: "USER",
    });
    await subscriptionRepo.create({
      userId: "user-1",
      plan: "FREE_TIER",
      status: "active",
    });
    await usageRepo.create({
      userId: "user-1",
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      analysisCount: 5,
      resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    });

    const result = await processUserAnalysisConsumedMessage(makeValidEvent());

    expect(result.outcome).toBe("limit_exceeded");
  });
});
