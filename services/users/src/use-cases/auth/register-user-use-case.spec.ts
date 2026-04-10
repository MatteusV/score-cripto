import { beforeEach, describe, expect, it } from "vitest";
import { SubscriptionInMemoryRepository } from "../../repositories/in-memory/subscription-in-memory-repository";
import { UsageInMemoryRepository } from "../../repositories/in-memory/usage-in-memory-repository";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository";
import { EmailAlreadyInUseError } from "../errors/email-already-in-use-error";
import { RegisterUserUseCase } from "./register-user-use-case";

const BCRYPT_HASH_REGEX = /^\$2b\$/;

let userRepo: UserInMemoryRepository;
let subscriptionRepo: SubscriptionInMemoryRepository;
let usageRepo: UsageInMemoryRepository;
let sut: RegisterUserUseCase;

describe("RegisterUserUseCase", () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    subscriptionRepo = new SubscriptionInMemoryRepository();
    usageRepo = new UsageInMemoryRepository();
    sut = new RegisterUserUseCase(userRepo, subscriptionRepo, usageRepo);
  });

  it("should register user successfully", async () => {
    const { user } = await sut.execute({
      email: "alice@example.com",
      password: "senha1234",
      name: "Alice",
    });

    expect(user.id).toEqual(expect.any(String));
    expect(user.email).toBe("alice@example.com");
    expect(user.name).toBe("Alice");
    expect(user.role).toBe("USER");
  });

  it("should not expose passwordHash in response", async () => {
    const { user } = await sut.execute({
      email: "bob@example.com",
      password: "senha1234",
    });

    expect(user).not.toHaveProperty("passwordHash");
  });

  it("should persist password hash (not plain text)", async () => {
    await sut.execute({ email: "carol@example.com", password: "senha1234" });

    const stored = userRepo.items.find((u) => u.email === "carol@example.com");
    expect(stored?.passwordHash).not.toBe("senha1234");
    expect(stored?.passwordHash).toMatch(BCRYPT_HASH_REGEX);
  });

  it("should throw EmailAlreadyInUseError if email already exists", async () => {
    await sut.execute({ email: "dup@example.com", password: "senha1234" });

    await expect(
      sut.execute({ email: "dup@example.com", password: "outrasenha" })
    ).rejects.toThrow(EmailAlreadyInUseError);
  });

  it("should fail with ZodError if email is invalid", async () => {
    await expect(
      sut.execute({ email: "nao-e-email", password: "senha1234" })
    ).rejects.toThrow();
  });

  it("should fail with ZodError if password has less than 8 characters", async () => {
    await expect(
      sut.execute({ email: "valid@example.com", password: "curta" })
    ).rejects.toThrow();
  });

  it("should create FREE_TIER Subscription automatically", async () => {
    const { user } = await sut.execute({
      email: "dave@example.com",
      password: "senha1234",
    });

    const subscription = subscriptionRepo.items.find(
      (s) => s.userId === user.id
    );
    expect(subscription).toBeDefined();
    expect(subscription?.plan).toBe("FREE_TIER");
    expect(subscription?.status).toBe("active");
  });

  it("should create initial UsageRecord for current month", async () => {
    const { user } = await sut.execute({
      email: "eve@example.com",
      password: "senha1234",
    });

    const now = new Date();
    const record = usageRepo.items.find((r) => r.userId === user.id);

    expect(record).toBeDefined();
    expect(record?.analysisCount).toBe(0);
    expect(record?.periodYear).toBe(now.getFullYear());
    expect(record?.periodMonth).toBe(now.getMonth() + 1);
  });

  it("should set resetAt to the 1st day of next month", async () => {
    const { user } = await sut.execute({
      email: "frank@example.com",
      password: "senha1234",
    });

    const now = new Date();
    const expectedReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const record = usageRepo.items.find((r) => r.userId === user.id);

    expect(record?.resetAt.getTime()).toBe(expectedReset.getTime());
  });
});
