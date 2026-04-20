import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import type { User } from "../../generated/prisma/client.js";
import type { SubscriptionRepository } from "../../repositories/subscription-repository.js";
import type { UsageRepository } from "../../repositories/usage-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import { EmailAlreadyInUseError } from "../errors/email-already-in-use-error.js";

const registerUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

type RegisterUserRequest = z.infer<typeof registerUserSchema>;

interface RegisterUserResponse {
  user: Omit<User, "passwordHash">;
}

export class RegisterUserUseCase {
  private readonly userRepository: UserRepository;
  private readonly subscriptionRepository: SubscriptionRepository;
  private readonly usageRepository: UsageRepository;

  constructor(
    userRepository: UserRepository,
    subscriptionRepository: SubscriptionRepository,
    usageRepository: UsageRepository,
  ) {
    this.userRepository = userRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.usageRepository = usageRepository;
  }

  async execute(data: RegisterUserRequest): Promise<RegisterUserResponse> {
    registerUserSchema.parse(data);

    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.userRepository.create({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    await this.subscriptionRepository.create({
      userId: user.id,
      plan: "FREE_TIER",
      status: "active",
    });

    const now = new Date();
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await this.usageRepository.create({
      userId: user.id,
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      analysisCount: 0,
      resetAt,
    });

    const { passwordHash: _omit, ...userWithoutPassword } = user;

    return { user: userWithoutPassword };
  }
}
