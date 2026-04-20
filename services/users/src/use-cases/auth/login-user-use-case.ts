import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { RefreshTokenRepository } from "../../repositories/refresh-token-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import type { JwtService } from "../../services/jwt-service.js";
import { InvalidCredentialsError } from "../errors/invalid-credentials-error.js";

export function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

interface LoginUserRequest {
  email: string;
  password: string;
}

interface LoginUserResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

export class LoginUserUseCase {
  private readonly userRepository: UserRepository;
  private readonly refreshTokenRepository: RefreshTokenRepository;
  private readonly jwtService: JwtService;

  constructor(
    userRepository: UserRepository,
    refreshTokenRepository: RefreshTokenRepository,
    jwtService: JwtService,
  ) {
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.jwtService = jwtService;
  }

  async execute(data: LoginUserRequest): Promise<LoginUserResponse> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawToken = randomBytes(64).toString("hex");
    const tokenHash = hashRefreshToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.create({
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
