import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { config } from "../../../config.js";
import { RefreshTokenPrismaRepository } from "../../../repositories/prisma/refresh-token-prisma-repository.js";
import { SubscriptionPrismaRepository } from "../../../repositories/prisma/subscription-prisma-repository.js";
import { UsagePrismaRepository } from "../../../repositories/prisma/usage-prisma-repository.js";
import { UserPrismaRepository } from "../../../repositories/prisma/user-prisma-repository.js";
import { prisma } from "../../../services/database.js";
import { JwtServiceImpl } from "../../../services/jwt-service.js";
import { LoginUserUseCase } from "../../../use-cases/auth/login-user-use-case.js";
import { RefreshTokenUseCase } from "../../../use-cases/auth/refresh-token-use-case.js";
import { RegisterUserUseCase } from "../../../use-cases/auth/register-user-use-case.js";
import { EmailAlreadyInUseError } from "../../../use-cases/errors/email-already-in-use-error.js";
import { InvalidCredentialsError } from "../../../use-cases/errors/invalid-credentials-error.js";
import { InvalidRefreshTokenError } from "../../../use-cases/errors/invalid-refresh-token-error.js";

const userRepo = new UserPrismaRepository(prisma);
const subscriptionRepo = new SubscriptionPrismaRepository(prisma);
const usageRepo = new UsagePrismaRepository(prisma);
const refreshTokenRepo = new RefreshTokenPrismaRepository(prisma);
const jwtService = new JwtServiceImpl(
  config.jwtPrivateKey,
  config.jwtPublicKey,
  config.jwtExpiresIn,
);

const registerUseCase = new RegisterUserUseCase(userRepo, subscriptionRepo, usageRepo);
const loginUseCase = new LoginUserUseCase(userRepo, refreshTokenRepo, jwtService);
const refreshUseCase = new RefreshTokenUseCase(refreshTokenRepo, userRepo, jwtService);

const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.string(),
});

export async function authHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/register
  typed.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Registrar novo usuário",
        body: z.object({
          email: z.email(),
          password: z.string().min(8),
          name: z.string().optional(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string().nullable(),
            createdAt: z.string(),
          }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { user } = await registerUseCase.execute(request.body);
        return reply.status(201).send({
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
        });
      } catch (err) {
        if (err instanceof EmailAlreadyInUseError) {
          return reply.status(409).send({ error: "Email already in use" });
        }
        throw err;
      }
    },
  );

  // POST /auth/login
  typed.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Autenticar usuário",
        body: z.object({
          email: z.email(),
          password: z.string().min(1),
        }),
        response: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            user: UserResponseSchema,
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await loginUseCase.execute(request.body);
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof InvalidCredentialsError) {
          return reply.status(401).send({ error: "Invalid credentials" });
        }
        throw err;
      }
    },
  );

  // POST /auth/refresh
  typed.post(
    "/refresh",
    {
      schema: {
        tags: ["auth"],
        summary: "Renovar tokens",
        body: z.object({ refreshToken: z.string().min(1) }),
        response: {
          200: z.object({ accessToken: z.string(), refreshToken: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await refreshUseCase.execute(request.body);
        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof InvalidRefreshTokenError) {
          return reply.status(401).send({ error: "Invalid or expired refresh token" });
        }
        throw err;
      }
    },
  );
}
