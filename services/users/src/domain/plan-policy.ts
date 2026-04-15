export interface PlanPolicy {
  getLimitForPlan(plan: string): number;
}

export class DefaultPlanPolicy implements PlanPolicy {
  private static readonly LIMITS: Record<string, number> = {
    FREE_TIER: 5,
    PRO: 15,
  };

  getLimitForPlan(plan: string): number {
    return DefaultPlanPolicy.LIMITS[plan] ?? DefaultPlanPolicy.LIMITS["FREE_TIER"];
  }
}
