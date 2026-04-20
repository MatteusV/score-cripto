import type { SubscriptionRepository } from "../../repositories/subscription-repository.js";
import type { UserRepository } from "../../repositories/user-repository.js";
import type { BillingService } from "../../services/billing-service.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

interface Input {
  cancelUrl: string;
  priceId: string;
  successUrl: string;
  userId: string;
}

interface Output {
  checkoutUrl: string;
}

export class CreateCheckoutSessionUseCase {
  private readonly userRepo: UserRepository;
  private readonly billingService: BillingService;

  constructor(
    userRepo: UserRepository,
    _subscriptionRepo: SubscriptionRepository,
    billingService: BillingService,
  ) {
    this.userRepo = userRepo;
    this.billingService = billingService;
  }

  async execute(input: Input): Promise<Output> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await this.billingService.createCustomer(user.email, user.name);
      await this.userRepo.update(user.id, { stripeCustomerId: customerId });
    }

    const checkoutUrl = await this.billingService.createCheckoutSession({
      customerId,
      priceId: input.priceId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    return { checkoutUrl };
  }
}
