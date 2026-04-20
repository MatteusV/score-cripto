import type { RefreshTokenRepository } from "../../repositories/refresh-token-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

export class DeleteAccountUseCase {
  private readonly userRepo: UserRepository;
  private readonly refreshTokenRepo: RefreshTokenRepository;

  constructor(userRepo: UserRepository, refreshTokenRepo: RefreshTokenRepository) {
    this.userRepo = userRepo;
    this.refreshTokenRepo = refreshTokenRepo;
  }

  async execute(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    await this.refreshTokenRepo.revokeAllByUserId(userId);
    await this.userRepo.delete(userId);
  }
}
