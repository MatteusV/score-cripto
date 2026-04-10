import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { RefreshTokenInMemoryRepository } from "../../repositories/in-memory/refresh-token-in-memory-repository";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository";
import { FakeJwtService } from "../../services/fake-jwt-service";
import { InvalidCredentialsError } from "../errors/invalid-credentials-error";
import { LoginUserUseCase } from "./login-user-use-case";

let userRepo: UserInMemoryRepository;
let refreshTokenRepo: RefreshTokenInMemoryRepository;
let jwtService: FakeJwtService;
let sut: LoginUserUseCase;

async function createUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return userRepo.create({ email, passwordHash });
}

describe("LoginUserUseCase", () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    refreshTokenRepo = new RefreshTokenInMemoryRepository();
    jwtService = new FakeJwtService();
    sut = new LoginUserUseCase(userRepo, refreshTokenRepo, jwtService);
  });

  it("should return accessToken, refreshToken and user data with valid credentials", async () => {
    await createUser("alice@example.com", "senha1234");

    const result = await sut.execute({
      email: "alice@example.com",
      password: "senha1234",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe("alice@example.com");
  });

  it("should not expose passwordHash in user response", async () => {
    await createUser("bob@example.com", "senha1234");

    const result = await sut.execute({
      email: "bob@example.com",
      password: "senha1234",
    });

    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("should persist refresh token (SHA-256 hash) in repository", async () => {
    await createUser("carol@example.com", "senha1234");

    const { refreshToken } = await sut.execute({
      email: "carol@example.com",
      password: "senha1234",
    });

    // O rawToken retornado é diferente do hash armazenado
    expect(refreshTokenRepo.items).toHaveLength(1);
    expect(refreshTokenRepo.items[0].tokenHash).not.toBe(refreshToken);
  });

  it("should throw InvalidCredentialsError for non-existent email", async () => {
    await expect(
      sut.execute({ email: "nao@existe.com", password: "senha1234" })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("should throw InvalidCredentialsError for incorrect password", async () => {
    await createUser("dave@example.com", "senha1234");

    await expect(
      sut.execute({ email: "dave@example.com", password: "senhaerrada" })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("should set refresh token expiresAt to 7 days in the future", async () => {
    await createUser("eve@example.com", "senha1234");

    const before = new Date();
    await sut.execute({ email: "eve@example.com", password: "senha1234" });

    const token = refreshTokenRepo.items[0];
    const diffDays =
      (token.expiresAt.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6.9);
    expect(diffDays).toBeLessThanOrEqual(7.1);
  });
});
