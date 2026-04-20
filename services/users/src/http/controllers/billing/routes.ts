import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { config } from "../../../config.js";
import { StripeWebhookEventPrismaRepository } from "../../../repositories/prisma/stripe-webhook-event-prisma-repository.js";
import { SubscriptionPrismaRepository } from "../../../repositories/prisma/subscription-prisma-repository.js";
import { UserPrismaRepository } from "../../../repositories/prisma/user-prisma-repository.js";
import { prisma } from "../../../services/database.js";
import { StripeBillingService } from "../../../services/stripe-billing-service.js";
import { CreateCheckoutSessionUseCase } from "../../../use-cases/billing/create-checkout-session-use-case.js";
import {
  CreatePortalSessionUseCase,
  NoBillingAccountError,
} from "../../../use-cases/billing/create-portal-session-use-case.js";
import { HandleStripeWebhookUseCase } from "../../../use-cases/billing/handle-stripe-webhook-use-case.js";
import { UserNotFoundError } from "../../../use-cases/errors/user-not-found-error.js";
import { authenticate } from "../../middleware/authenticate.js";

const userRepo = new UserPrismaRepository(prisma);
const subscriptionRepo = new SubscriptionPrismaRepository(prisma);
const webhookEventRepo = new StripeWebhookEventPrismaRepository(prisma);
const billingService = new StripeBillingService(config.stripeSecretKey, config.stripeWebhookSecret);

const checkoutUseCase = new CreateCheckoutSessionUseCase(
  userRepo,
  subscriptionRepo,
  billingService,
);
const portalUseCase = new CreatePortalSessionUseCase(userRepo, billingService);
const webhookUseCase = new HandleStripeWebhookUseCase(
  userRepo,
  subscriptionRepo,
  webhookEventRepo,
  billingService,
  config.stripeProPriceId,
);

export async function billingHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /billing/checkout — gera URL de checkout para upgrade
  typed.get(
    "/checkout",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["billing"],
        summary: "Gerar URL de checkout Stripe para upgrade de plano",
        querystring: z.object({ priceId: z.string().optional() }),
        response: {
          200: z.object({ checkoutUrl: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const priceId = (request.query as { priceId?: string }).priceId ?? config.stripeProPriceId;
      try {
        const result = await checkoutUseCase.execute({
          userId: request.user.id,
          priceId,
          successUrl: `${config.appBaseUrl}/settings/billing?success=1`,
          cancelUrl: `${config.appBaseUrl}/settings/billing?canceled=1`,
        });
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw err;
      }
    },
  );

  // GET /billing/portal — gera URL do Stripe Customer Portal
  typed.get(
    "/portal",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["billing"],
        summary: "Gerar URL do Stripe Customer Portal",
        response: {
          200: z.object({ portalUrl: z.string() }),
          404: z.object({ error: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await portalUseCase.execute({
          userId: request.user.id,
          returnUrl: `${config.appBaseUrl}/settings/billing`,
        });
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ error: "User not found" });
        }
        if (err instanceof NoBillingAccountError) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // GET /billing/subscription — retorna dados da assinatura atual
  typed.get(
    "/subscription",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["billing"],
        summary: "Retornar assinatura atual do usuário",
        response: {
          200: z.object({
            plan: z.string(),
            status: z.string(),
            currentPeriodEnd: z.string().nullable(),
            cancelAtPeriodEnd: z.boolean(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const sub = await subscriptionRepo.findByUserId(request.user.id);
      if (!sub) {
        return reply.status(404).send({ error: "Subscription not found" });
      }
      return reply.status(200).send({
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      });
    },
  );

  // rawBody não está no tipo base FastifyContextConfig mas é suportado em runtime
  const webhookOptions = {
    config: { rawBody: true },
    schema: {
      tags: ["billing"],
      summary: "Receber eventos do Stripe via webhook",
      headers: z.object({ "stripe-signature": z.string() }),
      response: {
        200: z.object({ received: z.boolean() }),
        400: z.object({ error: z.string() }),
      },
    },
  };
  // biome-ignore lint/suspicious/noExplicitAny: rawBody not in standard Fastify types
  const webhookConfig = webhookOptions as any;

  async function handleStripeWebhook(
    request: import("fastify").FastifyRequest,
    reply: import("fastify").FastifyReply,
  ) {
    const signature = request.headers["stripe-signature"] as string;
    if (!signature) {
      return reply.status(400).send({ error: "Missing stripe-signature header" });
    }

    const payload =
      (request as unknown as { rawBody?: Buffer }).rawBody?.toString() ??
      JSON.stringify(request.body);

    try {
      await webhookUseCase.execute({ payload, signature });
      return reply.status(200).send({ received: true });
    } catch (err) {
      app.log.error(err, "Stripe webhook error");
      return reply.status(400).send({ error: "Webhook processing failed" });
    }
  }

  // POST /billing/webhook  — path configurado no Stripe Dashboard
  app.post("/webhook", webhookConfig, handleStripeWebhook);

  // POST /billing/webhooks/stripe — alias alternativo
  app.post("/webhooks/stripe", webhookConfig, handleStripeWebhook);
}
