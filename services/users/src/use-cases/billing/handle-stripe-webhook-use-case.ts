import type { SubscriptionRepository } from "../../repositories/subscription-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import type { BillingService } from "../../services/billing-service.js";

interface Input {
  payload: string;
  signature: string;
}

export class HandleStripeWebhookUseCase {
  private readonly userRepo: UserRepository;
  private readonly subscriptionRepo: SubscriptionRepository;
  private readonly billingService: BillingService;

  constructor(
    userRepo: UserRepository,
    subscriptionRepo: SubscriptionRepository,
    billingService: BillingService
  ) {
    this.userRepo = userRepo;
    this.subscriptionRepo = subscriptionRepo;
    this.billingService = billingService;
  }

  async execute(input: Input): Promise<void> {
    const event = await this.billingService.handleWebhookEvent(
      input.payload,
      input.signature
    );

    const { type, data } = event;

    if (!data.customerId) {
      return;
    }

    const user = await this.userRepo.findByStripeCustomerId(data.customerId);
    if (!user) {
      return;
    }

    const subscription = await this.subscriptionRepo.findByUserId(user.id);
    if (!subscription) {
      return;
    }

    switch (type) {
      case "checkout.session.completed": {
        if (data.subscriptionId) {
          await this.subscriptionRepo.update(subscription.id, {
            stripeSubscriptionId: data.subscriptionId,
            status: "active",
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await this.subscriptionRepo.update(subscription.id, {
          stripeSubscriptionId:
            data.subscriptionId ?? subscription.stripeSubscriptionId,
          stripePriceId: data.priceId ?? subscription.stripePriceId,
          status:
            (data.status as "active" | "past_due" | "canceled" | "trialing") ??
            subscription.status,
          currentPeriodStart:
            data.currentPeriodStart ?? subscription.currentPeriodStart,
          currentPeriodEnd:
            data.currentPeriodEnd ?? subscription.currentPeriodEnd,
          cancelAtPeriodEnd:
            data.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd,
        });
        break;
      }

      case "customer.subscription.deleted": {
        await this.subscriptionRepo.update(subscription.id, {
          plan: "FREE_TIER",
          status: "canceled",
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
        });
        break;
      }

      case "invoice.payment_failed": {
        await this.subscriptionRepo.update(subscription.id, {
          status: "past_due",
        });
        break;
      }

      default:
        break;
    }
  }
}
