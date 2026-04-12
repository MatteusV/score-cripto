import { hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionInMemoryRepository } from "../../repositories/in-memory/subscription-in-memory-repository.js";
import { UsageInMemoryRepository } from "../../repositories/in-memory/usage-in-memory-repository.js";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { GetUserProfileUseCase } from "./get-user-profile-use-case.js";

describe("GetUserProfileUseCase", () => {
  let userRepo: UserInMemoryRepository;
  let subscriptionRepo: SubscriptionInMemoryRepository;
  let usageRepo: UsageInMemoryRepository;
  let sut: GetUserProfileUseCase;

  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    subscriptionRepo = new SubscriptionInMemoryRepository();
    usageRepo = new UsageInMemoryRepository();
    sut = new GetUserProfileUseCase(userRepo, subscriptionRepo, usageRepo);
  });

  it("should throw UserNotFoundError for unknown user", async () => {
    await expect(sut.execute("non-existent")).rejects.toThrow(
      UserNotFoundError
    );
  });

  it("should return profile with FREE_TIER defaults", async () => {
    const user = await userRepo.create({
      email: "user@example.com",
      passwordHash: hashSync("pass", 6),
      name: "Test User",
    });
    await subscriptionRepo.create({ userId: user.id, plan: "FREE_TIER" });

    const profile = await sut.execute(user.id);

    expect(profile.email).toBe("user@example.com");
    expect(profile.name).toBe("Test User");
    expect(profile.plan).toBe("FREE_TIER");
    expect(profile.analysisLimit).toBe(5);
    expect(profile.analysisCount).toBe(0);
  });

  it("should return PRO plan limit for PRO subscriber", async () => {
    const user = await userRepo.create({
      email: "pro@example.com",
      passwordHash: hashSync("pass", 6),
    });
    await subscriptionRepo.create({ userId: user.id, plan: "PRO" });

    const profile = await sut.execute(user.id);

    expect(profile.plan).toBe("PRO");
    expect(profile.analysisLimit).toBe(15);
  });
});
