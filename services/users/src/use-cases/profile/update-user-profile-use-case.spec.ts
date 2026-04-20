import { hashSync } from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import { UpdateUserProfileUseCase } from "./update-user-profile-use-case.js";

describe("UpdateUserProfileUseCase", () => {
  let userRepo: UserInMemoryRepository;
  let sut: UpdateUserProfileUseCase;

  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    sut = new UpdateUserProfileUseCase(userRepo);
  });

  it("should throw UserNotFoundError for unknown user", async () => {
    await expect(sut.execute({ userId: "non-existent", name: "New Name" })).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it("should update user name", async () => {
    const user = await userRepo.create({
      email: "user@example.com",
      passwordHash: hashSync("pass", 6),
      name: "Old Name",
    });

    const result = await sut.execute({ userId: user.id, name: "New Name" });

    expect(result.name).toBe("New Name");
    expect(result.email).toBe("user@example.com");
  });

  it("should keep existing name if none provided", async () => {
    const user = await userRepo.create({
      email: "user@example.com",
      passwordHash: hashSync("pass", 6),
      name: "Existing",
    });

    const result = await sut.execute({ userId: user.id });

    expect(result.name).toBe("Existing");
  });
});
