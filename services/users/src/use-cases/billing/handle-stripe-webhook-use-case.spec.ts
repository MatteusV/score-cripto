import { hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionInMemoryRepository } from "../../repositories/in-memory/subscription-in-memory-repository.js";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { FakeBillingService } from "../../services/fake-billing-service.js";
import { HandleStripeWebhookUseCase } from "./handle-stripe-webhook-use-case.js";

describe("HandleStripeWebhookUseCase", () => {
  let userRepo: UserInMemoryRepository;
  let subscriptionRepo: SubscriptionInMemoryRepository;
  let billingService: FakeBillingService;
  let sut: HandleStripeWebhookUseCase;

  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    subscriptionRepo = new SubscriptionInMemoryRepository();
    billingService = new FakeBillingService();
    sut = new HandleStripeWebhookUseCase(
      userRepo,
      subscriptionRepo,
      billingService
    );
  });

  async function seedUserWithSubscription(stripeCustomerId = "cus_123") {
    const user = await userRepo.create({
      email: "user@example.com",
      passwordHash: hashSync("pass", 6),
      stripeCustomerId,
    });
    const sub = await subscriptionRepo.create({ userId: user.id });
    return { user, sub };
  }

  it("should update subscription on checkout.session.completed", async () => {
    const { sub } = await seedUserWithSubscription();

    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        customerId: "cus_123",
        subscriptionId: "sub_abc",
      },
    });

    await sut.execute({ payload, signature: "fake" });

    const updated = subscriptionRepo.items.find((s) => s.id === sub.id);
    expect(updated?.stripeSubscriptionId).toBe("sub_abc");
    expect(updated?.status).toBe("active");
  });

  it("should update plan on customer.subscription.updated", async () => {
    const { sub } = await seedUserWithSubscription();

    const payload = JSON.stringify({
      type: "customer.subscription.updated",
      data: {
        customerId: "cus_123",
        subscriptionId: "sub_abc",
        priceId: "price_pro",
        status: "active",
      },
    });

    await sut.execute({ payload, signature: "fake" });

    const updated = subscriptionRepo.items.find((s) => s.id === sub.id);
    expect(updated?.stripePriceId).toBe("price_pro");
  });

  it("should reset to FREE_TIER on customer.subscription.deleted", async () => {
    const { sub } = await seedUserWithSubscription();
    await subscriptionRepo.update(sub.id, {
      plan: "PRO",
      stripeSubscriptionId: "sub_abc",
    });

    const payload = JSON.stringify({
      type: "customer.subscription.deleted",
      data: { customerId: "cus_123", subscriptionId: "sub_abc" },
    });

    await sut.execute({ payload, signature: "fake" });

    const updated = subscriptionRepo.items.find((s) => s.id === sub.id);
    expect(updated?.plan).toBe("FREE_TIER");
    expect(updated?.status).toBe("canceled");
    expect(updated?.stripeSubscriptionId).toBeNull();
  });

  it("should mark past_due on invoice.payment_failed", async () => {
    const { sub } = await seedUserWithSubscription();

    const payload = JSON.stringify({
      type: "invoice.payment_failed",
      data: {
        customerId: "cus_123",
        subscriptionId: "sub_abc",
        status: "past_due",
      },
    });

    await sut.execute({ payload, signature: "fake" });

    const updated = subscriptionRepo.items.find((s) => s.id === sub.id);
    expect(updated?.status).toBe("past_due");
  });

  it("should silently ignore unknown customerId", async () => {
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: { customerId: "cus_unknown", subscriptionId: "sub_xyz" },
    });

    await expect(
      sut.execute({ payload, signature: "fake" })
    ).resolves.toBeUndefined();
  });
});
