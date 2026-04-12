import type { UserRepository } from "../../repositories/user-repository.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

interface Input {
  name?: string;
  userId: string;
}

interface Output {
  email: string;
  id: string;
  name: string | null;
}

export class UpdateUserProfileUseCase {
  private readonly userRepo: UserRepository;

  constructor(userRepo: UserRepository) {
    this.userRepo = userRepo;
  }

  async execute(input: Input): Promise<Output> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const updated = await this.userRepo.update(user.id, {
      name: input.name ?? user.name ?? undefined,
    });

    return { id: updated.id, email: updated.email, name: updated.name };
  }
}
