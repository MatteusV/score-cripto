import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { RefreshTokenInMemoryRepository } from "../../repositories/in-memory/refresh-token-in-memory-repository.js";
import { UserInMemoryRepository } from "../../repositories/in-memory/user-in-memory-repository.js";
import { FakeJwtService } from "../../services/fake-jwt-service.js";
import { InvalidRefreshTokenError } from "../errors/invalid-refresh-token-error.js";
import { hashRefreshToken, LoginUserUseCase } from "./login-user-use-case.js";
import { RefreshTokenUseCase } from "./refresh-token-use-case.js";

let userRepo: UserInMemoryRepository;
let refreshTokenRepo: RefreshTokenInMemoryRepository;
let jwtService: FakeJwtService;
let loginUseCase: LoginUserUseCase;
let sut: RefreshTokenUseCase;

async function registerAndLogin(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await userRepo.create({ email, passwordHash });
  return loginUseCase.execute({ email, password });
}

describe("RefreshTokenUseCase", () => {
  beforeEach(() => {
    userRepo = new UserInMemoryRepository();
    refreshTokenRepo = new RefreshTokenInMemoryRepository();
    jwtService = new FakeJwtService();
    loginUseCase = new LoginUserUseCase(userRepo, refreshTokenRepo, jwtService);
    sut = new RefreshTokenUseCase(refreshTokenRepo, userRepo, jwtService);
  });

  it("should return new token pair with valid refresh token", async () => {
    const { refreshToken } = await registerAndLogin(
      "alice@example.com",
      "senha1234"
    );

    const result = await sut.execute({ refreshToken });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(refreshToken);
  });

  it("should revoke the old token after rotation", async () => {
    const { refreshToken } = await registerAndLogin(
      "bob@example.com",
      "senha1234"
    );

    await sut.execute({ refreshToken });

    const oldHash = hashRefreshToken(refreshToken);
    const stored = refreshTokenRepo.items.find((t) => t.tokenHash === oldHash);
    expect(stored?.revokedAt).not.toBeNull();
  });

  it("should create new persisted refresh token in repository", async () => {
    const { refreshToken } = await registerAndLogin(
      "carol@example.com",
      "senha1234"
    );

    await sut.execute({ refreshToken });

    // 1 from login + 1 from refresh = 2 tokens
    expect(refreshTokenRepo.items).toHaveLength(2);
  });

  it("should throw InvalidRefreshTokenError for invalid token", async () => {
    await expect(
      sut.execute({ refreshToken: "token-invalido" })
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it("should throw InvalidRefreshTokenError for already revoked token", async () => {
    const { refreshToken } = await registerAndLogin(
      "dave@example.com",
      "senha1234"
    );

    await sut.execute({ refreshToken });

    // Try to use the same token again
    await expect(sut.execute({ refreshToken })).rejects.toThrow(
      InvalidRefreshTokenError
    );
  });

  it("should throw InvalidRefreshTokenError for expired token", async () => {
    const { refreshToken } = await registerAndLogin(
      "eve@example.com",
      "senha1234"
    );

    const tokenHash = hashRefreshToken(refreshToken);
    const stored = refreshTokenRepo.items.find(
      (t) => t.tokenHash === tokenHash
    );
    if (stored) {
      stored.expiresAt = new Date(Date.now() - 1000);
    }

    await expect(sut.execute({ refreshToken })).rejects.toThrow(
      InvalidRefreshTokenError
    );
  });
});
