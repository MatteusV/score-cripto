import type {
  BillingService,
  CheckoutSessionParams,
  WebhookEvent,
} from "./billing-service.js";

export class FakeBillingService implements BillingService {
  private customerCounter = 0;

  async createCustomer(_email: string, _name?: string | null): Promise<string> {
    this.customerCounter++;
    return `cus_fake_${this.customerCounter}`;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<string> {
    return `https://checkout.stripe.com/fake/${params.customerId}`;
  }

  async createBillingPortalSession(
    customerId: string,
    _returnUrl: string
  ): Promise<string> {
    return `https://billing.stripe.com/fake/${customerId}`;
  }

  async handleWebhookEvent(
    payload: string,
    _signature: string
  ): Promise<WebhookEvent> {
    return JSON.parse(payload) as WebhookEvent;
  }
}
