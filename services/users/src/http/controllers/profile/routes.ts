import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { RefreshTokenPrismaRepository } from "../../../repositories/prisma/refresh-token-prisma-repository.js";
import { SubscriptionPrismaRepository } from "../../../repositories/prisma/subscription-prisma-repository.js";
import { UsagePrismaRepository } from "../../../repositories/prisma/usage-prisma-repository.js";
import { UserPrismaRepository } from "../../../repositories/prisma/user-prisma-repository.js";
import { prisma } from "../../../services/database.js";
import { InvalidCredentialsError } from "../../../use-cases/errors/invalid-credentials-error.js";
import { UserNotFoundError } from "../../../use-cases/errors/user-not-found-error.js";
import { ChangePasswordUseCase } from "../../../use-cases/profile/change-password-use-case.js";
import { DeleteAccountUseCase } from "../../../use-cases/profile/delete-account-use-case.js";
import { GetUserProfileUseCase } from "../../../use-cases/profile/get-user-profile-use-case.js";
import { UpdateUserProfileUseCase } from "../../../use-cases/profile/update-user-profile-use-case.js";
import { authenticate } from "../../middleware/authenticate.js";

const userRepo = new UserPrismaRepository(prisma);
const subscriptionRepo = new SubscriptionPrismaRepository(prisma);
const usageRepo = new UsagePrismaRepository(prisma);
const refreshTokenRepo = new RefreshTokenPrismaRepository(prisma);

const getProfileUseCase = new GetUserProfileUseCase(
  userRepo,
  subscriptionRepo,
  usageRepo
);
const updateProfileUseCase = new UpdateUserProfileUseCase(userRepo);
const changePasswordUseCase = new ChangePasswordUseCase(userRepo);
const deleteAccountUseCase = new DeleteAccountUseCase(
  userRepo,
  refreshTokenRepo
);

export async function profileHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /profile
  typed.get(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["profile"],
        summary: "Retornar perfil do usuário autenticado",
        response: {
          200: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string().nullable(),
            role: z.string(),
            plan: z.string(),
            analysisCount: z.number(),
            analysisLimit: z.number(),
            createdAt: z.string(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const profile = await getProfileUseCase.execute(request.user.id);
        return reply.status(200).send({
          ...profile,
          createdAt: profile.createdAt.toISOString(),
        });
      } catch (err) {
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw err;
      }
    }
  );

  // PATCH /profile
  typed.patch(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["profile"],
        summary: "Atualizar nome do usuário",
        body: z.object({ name: z.string().min(1).optional() }),
        response: {
          200: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string().nullable(),
          }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await updateProfileUseCase.execute({
          userId: request.user.id,
          name: request.body.name,
        });
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw err;
      }
    }
  );

  // POST /profile/change-password
  typed.post(
    "/change-password",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["profile"],
        summary: "Trocar senha do usuário",
        body: z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8),
        }),
        response: {
          204: z.object({}),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        await changePasswordUseCase.execute({
          userId: request.user.id,
          currentPassword: request.body.currentPassword,
          newPassword: request.body.newPassword,
        });
        return reply.status(204).send({});
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          return reply
            .status(401)
            .send({ error: "Current password is incorrect" });
        }
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw err;
      }
    }
  );

  // DELETE /profile
  typed.delete(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["profile"],
        summary: "Excluir conta do usuário",
        response: {
          204: z.object({}),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        await deleteAccountUseCase.execute(request.user.id);
        return reply.status(204).send({});
      } catch (err) {
        if (err instanceof UserNotFoundError) {
          return reply.status(404).send({ error: "User not found" });
        }
        throw err;
      }
    }
  );
}
