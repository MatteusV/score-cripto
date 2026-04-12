import { compare, hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { InvalidCredentialsError } from "../errors/invalid-credentials-error.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { ChangePasswordUseCase } from "./change-password-use-case.js";

describe("ChangePasswordUseCase", () => {
  let userRepo: UserInMemoryRepository;
  let sut: ChangePasswordUseCase;

  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    sut = new ChangePasswordUseCase(userRepo);
  });

  it("should throw UserNotFoundError for unknown user", async () => {
    await expect(
      sut.execute({
        userId: "non-existent",
        currentPassword: "any",
        newPassword: "newpass",
      })
    ).rejects.toThrow(UserNotFoundError);
  });

  it("should throw InvalidCredentialsError for wrong current password", async () => {
    const user = await userRepo.create({
      email: "user@example.com",
      passwordHash: hashSync("correct-pass", 6),
    });

    await expect(
      sut.execute({
        userId: user.id,
        currentPassword: "wrong-pass",
        newPassword: "new-password",
      })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("should update password hash on success", async () => {
    const user = await userRepo.create({
      email: "user@example.com",
      passwordHash: hashSync("old-pass", 6),
    });

    await sut.execute({
      userId: user.id,
      currentPassword: "old-pass",
      newPassword: "new-pass-123",
    });

    const updated = await userRepo.findById(user.id);
    if (!updated) {
      throw new Error("User should exist");
    }
    const matches = await compare("new-pass-123", updated.passwordHash);
    expect(matches).toBe(true);
  });
});
