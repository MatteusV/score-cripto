import type { Plan } from "../generated/prisma/browser";

export const PLAN_LIMITS: Record<Plan, number> = {
  FREE_TIER: 5,
  PRO: 15,
};

export function getLimitForPlan(plan: Plan): number {
  return PLAN_LIMITS[plan];
}
