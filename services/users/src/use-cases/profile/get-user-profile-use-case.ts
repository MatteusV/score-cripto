import type { SubscriptionRepository } from "../../repositories/subscription-repository.js";
import type { UsageRepository } from "../../repositories/usage-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

interface Output {
  analysisCount: number;
  analysisLimit: number;
  createdAt: Date;
  email: string;
  id: string;
  name: string | null;
  plan: string;
  role: string;
}

const PLAN_LIMITS: Record<string, number> = {
  FREE_TIER: 5,
  PRO: 15,
};

export class GetUserProfileUseCase {
  private readonly userRepo: UserRepository;
  private readonly subscriptionRepo: SubscriptionRepository;
  private readonly usageRepo: UsageRepository;

  constructor(
    userRepo: UserRepository,
    subscriptionRepo: SubscriptionRepository,
    usageRepo: UsageRepository
  ) {
    this.userRepo = userRepo;
    this.subscriptionRepo = subscriptionRepo;
    this.usageRepo = usageRepo;
  }

  async execute(userId: string): Promise<Output> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const subscription = await this.subscriptionRepo.findByUserId(userId);
    const plan = subscription?.plan ?? "FREE_TIER";

    const now = new Date();
    const usage = await this.usageRepo.findByUserAndPeriod(
      userId,
      now.getFullYear(),
      now.getMonth() + 1
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan,
      analysisCount: usage?.analysisCount ?? 0,
      analysisLimit: PLAN_LIMITS[plan] ?? 5,
      createdAt: user.createdAt,
    };
  }
}
