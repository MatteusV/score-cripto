import type { Subscription } from "../generated/prisma/browser";
import type { SubscriptionUncheckedCreateInput } from "../generated/prisma/models/Subscription";

export type SubscriptionUpdateData = Partial<
  Omit<Subscription, "id" | "userId">
>;

export interface SubscriptionRepository {
  create: (data: SubscriptionUncheckedCreateInput) => Promise<Subscription>;
  findByStripeCustomerId: (
    stripeCustomerId: string
  ) => Promise<Subscription | null>;
  findByUserId: (userId: string) => Promise<Subscription | null>;
  update: (id: string, data: SubscriptionUpdateData) => Promise<Subscription>;
}
