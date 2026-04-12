import { compare, hash } from "bcryptjs";
import type { UserRepository } from "../../repositories/user-repository.js";
import { InvalidCredentialsError } from "../errors/invalid-credentials-error.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

interface Input {
  currentPassword: string;
  newPassword: string;
  userId: string;
}

export class ChangePasswordUseCase {
  private readonly userRepo: UserRepository;

  constructor(userRepo: UserRepository) {
    this.userRepo = userRepo;
  }

  async execute(input: Input): Promise<void> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const passwordMatches = await compare(
      input.currentPassword,
      user.passwordHash
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const newHash = await hash(input.newPassword, 10);
    await this.userRepo.update(user.id, { passwordHash: newHash });
  }
}
