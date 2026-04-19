export interface CheckoutSessionParams {
  cancelUrl: string;
  customerId: string;
  priceId: string;
  successUrl: string;
}

export interface WebhookEvent {
  data: WebhookEventData;
  id: string;
  type: string;
}

export interface WebhookEventData {
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date;
  currentPeriodStart?: Date;
  customerId?: string;
  priceId?: string;
  status?: string;
  subscriptionId?: string;
}

export interface BillingService {
  createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<string>;
  createCheckoutSession(params: CheckoutSessionParams): Promise<string>;
  createCustomer(email: string, name?: string | null): Promise<string>;
  handleWebhookEvent(payload: string, signature: string): Promise<WebhookEvent>;
}
