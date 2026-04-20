import { hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { FakeBillingService } from "../../services/fake-billing-service.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import {
  CreatePortalSessionUseCase,
  NoBillingAccountError,
} from "./create-portal-session-use-case.js";

describe("CreatePortalSessionUseCase", () => {
  let userRepo: UserInMemoryRepository;
  let billingService: FakeBillingService;
  let sut: CreatePortalSessionUseCase;

  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    billingService = new FakeBillingService();
    sut = new CreatePortalSessionUseCase(userRepo, billingService);
  });

  it("should throw UserNotFoundError for unknown user", async () => {
    await expect(
      sut.execute({ userId: "non-existent", returnUrl: "http://example.com" }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it("should throw NoBillingAccountError when user has no stripeCustomerId", async () => {
    const user = await userRepo.create({
      email: "test@example.com",
      passwordHash: hashSync("password", 6),
    });

    await expect(sut.execute({ userId: user.id, returnUrl: "http://example.com" })).rejects.toThrow(
      NoBillingAccountError,
    );
  });

  it("should return portal URL for user with stripeCustomerId", async () => {
    const user = await userRepo.create({
      email: "subscriber@example.com",
      passwordHash: hashSync("password", 6),
      stripeCustomerId: "cus_123",
    });

    const result = await sut.execute({
      userId: user.id,
      returnUrl: "http://example.com/settings",
    });

    expect(result.portalUrl).toContain("billing.stripe.com");
    expect(result.portalUrl).toContain("cus_123");
  });
});
