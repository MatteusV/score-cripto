import type { PrismaClient } from "../../generated/prisma/client.js";
import type { StripeWebhookEventRepository } from "../stripe-webhook-event-repository.js";

export class StripeWebhookEventPrismaRepository
  implements StripeWebhookEventRepository
{
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async tryRecord(eventId: string): Promise<boolean> {
    try {
      await this.prisma.stripeWebhookEvent.create({ data: { id: eventId } });
      return true;
    } catch (err) {
      // P2002 = unique constraint violation → evento já processado.
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        return false;
      }
      throw err;
    }
  }
}
