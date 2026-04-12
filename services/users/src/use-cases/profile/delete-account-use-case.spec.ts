import { hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { RefreshTokenInMemoryRepository } from "../../repositories/in-memory/refresh-token-in-memory-repository.js";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { DeleteAccountUseCase } from "./delete-account-use-case.js";

describe("DeleteAccountUseCase", () => {
  let userRepo: UserInMemoryRepository;
  let refreshTokenRepo: RefreshTokenInMemoryRepository;
  let sut: DeleteAccountUseCase;

  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    refreshTokenRepo = new RefreshTokenInMemoryRepository();
    sut = new DeleteAccountUseCase(userRepo, refreshTokenRepo);
  });

  it("should throw UserNotFoundError for unknown user", async () => {
    await expect(sut.execute("non-existent")).rejects.toThrow(
      UserNotFoundError
    );
  });

  it("should delete user and revoke all refresh tokens", async () => {
    const user = await userRepo.create({
      email: "user@example.com",
      passwordHash: hashSync("pass", 6),
    });
    await refreshTokenRepo.create({
      userId: user.id,
      tokenHash: "hash1",
      expiresAt: new Date(Date.now() + 100_000),
    });

    await sut.execute(user.id);

    const deleted = await userRepo.findById(user.id);
    expect(deleted).toBeNull();
  });
});
