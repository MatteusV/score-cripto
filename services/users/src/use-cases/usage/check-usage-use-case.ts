import type { PlanPolicy } from "../../domain/plan-policy";
import type { SubscriptionRepository } from "../../repositories/subscription-repository";
import type { UsageRepository } from "../../repositories/usage-repository";

interface CheckUsageRequest {
  userId: string;
}

interface CheckUsageResponse {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetsAt: Date;
}

export class CheckUsageUseCase {
  private readonly usageRepository: UsageRepository;
  private readonly subscriptionRepository: SubscriptionRepository;
  private readonly planPolicy: PlanPolicy;

  constructor(
    usageRepository: UsageRepository,
    subscriptionRepository: SubscriptionRepository,
    planPolicy: PlanPolicy
  ) {
    this.usageRepository = usageRepository;
    this.subscriptionRepository = subscriptionRepository;
    this.planPolicy = planPolicy;
  }

  async execute({ userId }: CheckUsageRequest): Promise<CheckUsageResponse> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    const plan = subscription?.plan ?? "FREE_TIER";
    const limit = this.planPolicy.getLimitForPlan(plan);

    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;

    let record = await this.usageRepository.findByUserAndPeriod(
      userId,
      periodYear,
      periodMonth
    );

    if (!record) {
      const resetAt = new Date(periodYear, periodMonth, 1); // dia 1 do próximo mês
      record = await this.usageRepository.create({
        userId,
        periodYear,
        periodMonth,
        analysisCount: 0,
        resetAt,
      });
    } else if (record.resetAt <= now) {
      // Mês virou desde o último reset
      const resetAt = new Date(periodYear, periodMonth, 1);
      record = await this.usageRepository.reset(record.id, resetAt);
    }

    const remaining = Math.max(0, limit - record.analysisCount);

    return {
      allowed: remaining > 0,
      remaining,
      limit,
      resetsAt: record.resetAt,
    };
  }
}
