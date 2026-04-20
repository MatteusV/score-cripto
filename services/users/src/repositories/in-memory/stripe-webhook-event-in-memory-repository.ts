import type { StripeWebhookEventRepository } from "../stripe-webhook-event-repository.js";

export class StripeWebhookEventInMemoryRepository implements StripeWebhookEventRepository {
  private readonly ids = new Set<string>();

  async tryRecord(eventId: string): Promise<boolean> {
    if (this.ids.has(eventId)) {
      return false;
    }
    this.ids.add(eventId);
    return true;
  }
}
