import type { SubscriptionRepository } from "../../repositories/subscription-repository";
import type { UsageRepository } from "../../repositories/usage-repository";
import { getLimitForPlan } from "../../services/plan-service";
import { UsageLimitExceededError } from "../errors/usage-limit-exceeded-error";

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

  constructor(
    usageRepository: UsageRepository,
    subscriptionRepository: SubscriptionRepository
  ) {
    this.usageRepository = usageRepository;
    this.subscriptionRepository = subscriptionRepository;
  }

  async execute({
    userId,
  }: ConsumeUsageRequest): Promise<ConsumeUsageResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    const plan = subscription?.plan ?? "FREE_TIER";
    const limit = getLimitForPlan(plan);

    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;

    let record = await this.usageRepository.findByUserAndPeriod(
      userId,
      periodYear,
      periodMonth
    );

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
