import type { UserRepository } from "../../repositories/user-repository.js";
import type { BillingService } from "../../services/billing-service.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";

export class NoBillingAccountError extends Error {
  constructor() {
    super("User does not have a Stripe customer account");
    this.name = "NoBillingAccountError";
  }
}

interface Input {
  returnUrl: string;
  userId: string;
}

interface Output {
  portalUrl: string;
}

export class CreatePortalSessionUseCase {
  private readonly userRepo: UserRepository;
  private readonly billingService: BillingService;

  constructor(userRepo: UserRepository, billingService: BillingService) {
    this.userRepo = userRepo;
    this.billingService = billingService;
  }

  async execute(input: Input): Promise<Output> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    if (!user.stripeCustomerId) {
      throw new NoBillingAccountError();
    }

    const portalUrl = await this.billingService.createBillingPortalSession(
      user.stripeCustomerId,
      input.returnUrl,
    );

    return { portalUrl };
  }
}
