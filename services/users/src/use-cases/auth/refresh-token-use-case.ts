import { randomBytes } from "node:crypto";
import type { RefreshTokenRepository } from "../../repositories/refresh-token-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import type { JwtService } from "../../services/jwt-service.js";
import { InvalidRefreshTokenError } from "../errors/invalid-refresh-token-error.js";
import { hashRefreshToken } from "./login-user-use-case.js";

interface RefreshTokenRequest {
  refreshToken: string;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  private readonly refreshTokenRepository: RefreshTokenRepository;
  private readonly userRepository: UserRepository;
  private readonly jwtService: JwtService;

  constructor(
    refreshTokenRepository: RefreshTokenRepository,
    userRepository: UserRepository,
    jwtService: JwtService
  ) {
    this.refreshTokenRepository = refreshTokenRepository;
    this.userRepository = userRepository;
    this.jwtService = jwtService;
  }

  async execute(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const tokenHash = hashRefreshToken(data.refreshToken);
    const stored = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!stored) {
      throw new InvalidRefreshTokenError();
    }
    if (stored.revokedAt) {
      throw new InvalidRefreshTokenError();
    }
    if (stored.expiresAt < new Date()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.userRepository.findById(stored.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    await this.refreshTokenRepository.revoke(stored.id);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    const newRawToken = randomBytes(64).toString("hex");
    const newTokenHash = hashRefreshToken(newRawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.create({
      tokenHash: newTokenHash,
      userId: user.id,
      expiresAt,
    });

    return { accessToken, refreshToken: newRawToken };
  }
}
