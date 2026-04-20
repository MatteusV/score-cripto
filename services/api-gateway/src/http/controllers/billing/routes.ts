import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import {
  forwardToUsers,
  UsersForwardError,
} from "../../../services/users-forward.js";
import { authenticate } from "../../middleware/authenticate.js";

function upstreamErrorStatus(err: unknown): number {
  if (err instanceof UsersForwardError) {
    return err.statusCode;
  }
  return 503;
}

export async function billingHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /billing/subscription — proxy autenticado
  typed.get(
    "/subscription",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["billing"],
        summary: "Assinatura ativa do usuário (proxy para users)",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { status, data } = await forwardToUsers({
          method: "GET",
          path: "/billing/subscription",
          authHeader: request.headers.authorization,
        });
        return reply.status(status).send(data);
      } catch (err) {
        return reply
          .status(upstreamErrorStatus(err))
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );

  // GET /billing/portal — proxy autenticado
  typed.get(
    "/portal",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["billing"],
        summary: "URL do customer portal Stripe (proxy para users)",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          returnUrl: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { returnUrl } = request.query;
      const qs = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
      try {
        const { status, data } = await forwardToUsers({
          method: "GET",
          path: "/billing/portal",
          queryString: qs,
          authHeader: request.headers.authorization,
        });
        return reply.status(status).send(data);
      } catch (err) {
        return reply
          .status(upstreamErrorStatus(err))
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );

  // GET /billing/checkout — proxy autenticado
  typed.get(
    "/checkout",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["billing"],
        summary: "URL do checkout Stripe (proxy para users)",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          priceId: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { priceId } = request.query;
      const qs = priceId ? `?priceId=${encodeURIComponent(priceId)}` : "";
      try {
        const { status, data } = await forwardToUsers({
          method: "GET",
          path: "/billing/checkout",
          queryString: qs,
          authHeader: request.headers.authorization,
        });
        return reply.status(status).send(data);
      } catch (err) {
        return reply
          .status(upstreamErrorStatus(err))
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );

  // POST /billing/webhook — passthrough puro do Stripe para users
  // Raw body preservado para manter a assinatura HMAC válida ponta a ponta.
  // Nenhuma validação aqui — users continua sendo o único que conhece
  // STRIPE_WEBHOOK_SECRET e processa o evento.
  app.post(
    "/webhook",
    {
      config: { rawBody: true },
      schema: {
        tags: ["billing"],
        summary: "Stripe webhook (passthrough para users via Flycast)",
      },
    },
    async (request: FastifyRequest & { rawBody?: Buffer | string }, reply) => {
      const rawBody = request.rawBody;
      if (rawBody === undefined) {
        return reply
          .status(500)
          .send({ error: "Raw body not available for webhook" });
      }

      const signature = request.headers["stripe-signature"];
      const extraHeaders: Record<string, string> = {
        "Content-Type":
          (request.headers["content-type"] as string) ?? "application/json",
      };
      if (typeof signature === "string") {
        extraHeaders["stripe-signature"] = signature;
      }

      try {
        const { status, data } = await forwardToUsers({
          method: "POST",
          path: "/billing/webhook",
          rawBody,
          extraHeaders,
        });
        return reply.status(status).send(data);
      } catch (err) {
        return reply
          .status(upstreamErrorStatus(err))
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );
}
