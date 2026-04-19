import { randomUUID } from "node:crypto";
import type { Subscription } from "../../generated/prisma/client.js";
import type { SubscriptionUncheckedCreateInput } from "../../generated/prisma/models/Subscription.js";
import type {
  SubscriptionRepository,
  SubscriptionUpdateData,
} from "../subscription-repository.js";

export class SubscriptionInMemoryRepository implements SubscriptionRepository {
  items: Subscription[] = [];

  async create(data: SubscriptionUncheckedCreateInput) {
    const subscription: Subscription = {
      id: data.id ?? randomUUID(),
      userId: data.userId,
      plan: data.plan ?? "FREE_TIER",
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      stripePriceId: data.stripePriceId ?? null,
      status: data.status ?? "active",
      currentPeriodStart: data.currentPeriodStart
        ? new Date(data.currentPeriodStart as string | Date)
        : null,
      currentPeriodEnd: data.currentPeriodEnd
        ? new Date(data.currentPeriodEnd as string | Date)
        : null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
    };
    this.items.push(subscription);
    return subscription;
  }

  async findByUserId(userId: string) {
    return this.items.find((s) => s.userId === userId) ?? null;
  }

  async findByStripeCustomerId(_stripeCustomerId: string) {
    return null;
  }

  async update(id: string, data: SubscriptionUpdateData) {
    const idx = this.items.findIndex((s) => s.id === id);
    if (idx === -1) {
      throw new Error(`Subscription not found: ${id}`);
    }
    this.items[idx] = { ...this.items[idx], ...data } as Subscription;
    return this.items[idx];
  }
}
