import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { DefaultPlanPolicy } from "../../../domain/plan-policy.js";
import { authenticate } from "../../middleware/authenticate.js";
import { SubscriptionPrismaRepository } from "../../../repositories/prisma/subscription-prisma-repository.js";
import { UsagePrismaRepository } from "../../../repositories/prisma/usage-prisma-repository.js";
import { UserPrismaRepository } from "../../../repositories/prisma/user-prisma-repository.js";
import { prisma } from "../../../services/database.js";
import { UsageLimitExceededError } from "../../../use-cases/errors/usage-limit-exceeded-error.js";
import { UserNotFoundError } from "../../../use-cases/errors/user-not-found-error.js";
import { CheckUsageUseCase } from "../../../use-cases/usage/check-usage-use-case.js";
import { ConsumeUsageUseCase } from "../../../use-cases/usage/consume-usage-use-case.js";

const userRepo = new UserPrismaRepository(prisma);
const usageRepo = new UsagePrismaRepository(prisma);
const subscriptionRepo = new SubscriptionPrismaRepository(prisma);
const planPolicy = new DefaultPlanPolicy();

const checkUseCase = new CheckUsageUseCase(
  usageRepo,
  subscriptionRepo,
  planPolicy
);
const consumeUseCase = new ConsumeUsageUseCase(
  usageRepo,
  subscriptionRepo,
  userRepo,
  planPolicy
);

const UsageResponseSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number(),
  limit: z.number(),
  resetsAt: z.string(),
});

export async function usageHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /usage/:userId
  typed.get(
    "/:userId",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["usage"],
        summary: "Consultar uso mensal do usuário",
        params: z.object({ userId: z.string() }),
        response: {
          200: UsageResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const requester = request.user;

      const isAdmin = requester.role === "ADMIN";
      if (!isAdmin && requester.id !== userId) {
        return reply.status(404).send({ error: "User not found" });
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const result = await checkUseCase.execute({ userId });
      return reply.status(200).send({
        ...result,
        resetsAt: result.resetsAt.toISOString(),
      });
    }
  );

  // POST /usage/check
  typed.post(
    "/check",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["usage"],
        summary: "Verificar se usuário pode fazer análise",
        description: "Usado pelo API Gateway antes de criar uma análise.",
        response: {
          200: UsageResponseSchema,
          404: z.object({ error: z.string("User not found") }),
          429: z.object({ error: z.string(), retryAt: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;

      const user = await userRepo.findById(userId);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const result = await checkUseCase.execute({ userId });

      if (!result.allowed) {
        return reply.status(429).send({
          error: "Monthly analysis limit reached",
          retryAt: result.resetsAt.toISOString(),
        });
      }

      return reply.status(200).send({
        ...result,
        resetsAt: result.resetsAt.toISOString(),
      });
    }
  );

  // POST /usage/consume
  typed.post(
    "/consume",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["usage"],
        summary: "Registrar consumo de análise",
        response: {
          200: z.object({ remaining: z.number(), limit: z.number() }),
          429: z.object({ error: z.string() }),
          404: z.object({ error: z.string("User not found") }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;
      try {
        const result = await consumeUseCase.execute({ userId });
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof UsageLimitExceededError) {
          return reply
            .status(429)
            .send({ error: "Monthly analysis limit reached" });
        }
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw err;
      }
    }
  );
}
