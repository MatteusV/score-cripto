import type { Subscription } from "../generated/prisma/browser";
import type { SubscriptionUncheckedCreateInput } from "../generated/prisma/models/Subscription";

export interface SubscriptionRepository {
  create: (data: SubscriptionUncheckedCreateInput) => Promise<Subscription>;
  findByUserId: (userId: string) => Promise<Subscription | null>;
}
