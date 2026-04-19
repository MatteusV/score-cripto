import type { PrismaClient } from "../../generated/prisma/client.js";
import type { SubscriptionUncheckedCreateInput } from "../../generated/prisma/models/Subscription.js";
import type {
  SubscriptionRepository,
  SubscriptionUpdateData,
} from "../subscription-repository.js";

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

  async findByStripeCustomerId(stripeCustomerId: string) {
    return this.prisma.subscription.findFirst({
      where: { user: { stripeCustomerId } },
    });
  }

  async update(id: string, data: SubscriptionUpdateData) {
    return this.prisma.subscription.update({ where: { id }, data });
  }
}
