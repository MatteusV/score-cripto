import type { PrismaClient } from "../../generated/prisma/client";
import type { SubscriptionUncheckedCreateInput } from "../../generated/prisma/models/Subscription";
import type { SubscriptionRepository } from "../subscription-repository";

export class SubscriptionPrismaRepository implements SubscriptionRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: SubscriptionUncheckedCreateInput) {
    return this.prisma.subscription.create({ data });
  }

  async findByUserId(userId: string) {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }
}
