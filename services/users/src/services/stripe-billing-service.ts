import Stripe from "stripe";
import type {
  BillingService,
  CheckoutSessionParams,
  WebhookEvent,
} from "./billing-service.js";

export class StripeBillingService implements BillingService {
  private _stripe: Stripe | null = null;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  private get stripe(): Stripe {
    if (!this._stripe) {
      if (!this.secretKey) {
        throw new Error("STRIPE_SECRET_KEY is not configured");
      }
      this._stripe = new Stripe(this.secretKey);
    }
    return this._stripe;
  }

  async createCustomer(email: string, name?: string | null): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name: name ?? undefined,
    });
    return customer.id;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      payment_method_types: ["card"],
      line_items: [{ price: params.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    if (!session.url) {
      throw new Error("Stripe checkout session URL not available");
    }
    return session.url;
  }

  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  async handleWebhookEvent(
    payload: string,
    signature: string
  ): Promise<WebhookEvent> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          type: event.type,
          data: {
            customerId: session.customer as string,
            subscriptionId: session.subscription as string,
          },
        };
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        return {
          type: event.type,
          data: {
            customerId: sub.customer as string,
            subscriptionId: sub.id,
            priceId,
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        };
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        return {
          type: event.type,
          data: {
            customerId: sub.customer as string,
            subscriptionId: sub.id,
            status: "canceled",
          },
        };
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        return {
          type: event.type,
          data: {
            customerId: invoice.customer as string,
            subscriptionId: invoice.subscription as string,
            status: "past_due",
          },
        };
      }
      default:
        return { type: event.type, data: {} };
    }
  }
}
