import { hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionInMemoryRepository } from "../../repositories/in-memory/subscription-in-memory-repository.js";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { FakeBillingService } from "../../services/fake-billing-service.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { CreateCheckoutSessionUseCase } from "./create-checkout-session-use-case.js";

describe("CreateCheckoutSessionUseCase", () => {
  let userRepo: UserInMemoryRepository;
  let subscriptionRepo: SubscriptionInMemoryRepository;
  let billingService: FakeBillingService;
  let sut: CreateCheckoutSessionUseCase;

  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    subscriptionRepo = new SubscriptionInMemoryRepository();
    billingService = new FakeBillingService();
    sut = new CreateCheckoutSessionUseCase(
      userRepo,
      subscriptionRepo,
      billingService
    );
  });

  it("should throw UserNotFoundError for unknown user", async () => {
    await expect(
      sut.execute({
        userId: "non-existent",
        priceId: "price_pro",
        successUrl: "http://example.com/success",
        cancelUrl: "http://example.com/cancel",
      })
    ).rejects.toThrow(UserNotFoundError);
  });

  it("should create a Stripe customer and return checkout URL", async () => {
    const user = await userRepo.create({
      email: "test@example.com",
      passwordHash: hashSync("password", 6),
    });

    const result = await sut.execute({
      userId: user.id,
      priceId: "price_pro",
      successUrl: "http://example.com/success",
      cancelUrl: "http://example.com/cancel",
    });

    expect(result.checkoutUrl).toContain("checkout.stripe.com");
    expect(result.checkoutUrl).toContain("cus_fake_");
  });

  it("should reuse existing stripeCustomerId", async () => {
    const user = await userRepo.create({
      email: "existing@example.com",
      passwordHash: hashSync("password", 6),
      stripeCustomerId: "cus_existing_123",
    });

    const result = await sut.execute({
      userId: user.id,
      priceId: "price_pro",
      successUrl: "http://example.com/success",
      cancelUrl: "http://example.com/cancel",
    });

    expect(result.checkoutUrl).toContain("cus_existing_123");
  });
});
