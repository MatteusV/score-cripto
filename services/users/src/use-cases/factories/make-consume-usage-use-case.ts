import { DefaultPlanPolicy } from "../../domain/plan-policy";
import { SubscriptionPrismaRepository } from "../../repositories/prisma/subscription-prisma-repository";
import { UsagePrismaRepository } from "../../repositories/prisma/usage-prisma-repository";
import { UserPrismaRepository } from "../../repositories/prisma/user-prisma-repository";
import { prisma } from "../../services/database";
import { ConsumeUsageUseCase } from "../usage/consume-usage-use-case";

export function makeConsumeUsageUseCase(): ConsumeUsageUseCase {
  const usageRepo = new UsagePrismaRepository(prisma);
  const subscriptionRepo = new SubscriptionPrismaRepository(prisma);
  const userRepo = new UserPrismaRepository(prisma);
  return new ConsumeUsageUseCase(usageRepo, subscriptionRepo, userRepo, new DefaultPlanPolicy());
}
