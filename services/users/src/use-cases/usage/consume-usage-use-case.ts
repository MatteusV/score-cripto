import type { PlanPolicy } from "../../domain/plan-policy.js";
import type { SubscriptionRepository } from "../../repositories/subscription-repository.js";
import type { UsageRepository } from "../../repositories/usage-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import { UsageLimitExceededError } from "../errors/usage-limit-exceeded-error.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

interface ConsumeUsageRequest {
  userId: string;
}

interface ConsumeUsageResponse {
  limit: number;
  remaining: number;
}

export class ConsumeUsageUseCase {
  private readonly usageRepository: UsageRepository;
  private readonly subscriptionRepository: SubscriptionRepository;
  private readonly userRepository: UserRepository;
  private readonly planPolicy: PlanPolicy;

  constructor(
    usageRepository: UsageRepository,
    subscriptionRepository: SubscriptionRepository,
    userRepository: UserRepository,
    planPolicy: PlanPolicy,
  ) {
    this.usageRepository = usageRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.userRepository = userRepository;
    this.planPolicy = planPolicy;
  }

  async execute({ userId }: ConsumeUsageRequest): Promise<ConsumeUsageResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const subscription = await this.subscriptionRepository.findByUserId(userId);
    const plan = subscription?.plan ?? "FREE_TIER";
    const limit = this.planPolicy.getLimitForPlan(plan);

    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;

    let record = await this.usageRepository.findByUserAndPeriod(userId, periodYear, periodMonth);

    if (!record) {
      const resetAt = new Date(periodYear, periodMonth, 1);
      record = await this.usageRepository.create({
        userId,
        periodYear,
        periodMonth,
        analysisCount: 0,
        resetAt,
      });
    }

    if (record.analysisCount >= limit) {
      throw new UsageLimitExceededError();
    }

    const updated = await this.usageRepository.increment(record.id);
    const remaining = Math.max(0, limit - updated.analysisCount);

    return { remaining, limit };
  }
}
