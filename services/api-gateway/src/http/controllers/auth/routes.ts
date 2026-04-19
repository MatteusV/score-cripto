import type { FastifyInstance } from "fastify";
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

export async function authHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/login — proxy para users
  typed.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Autenticar usuário (proxy para users)",
        body: z.object({
          email: z.string(),
          password: z.string(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { status, data } = await forwardToUsers({
          method: "POST",
          path: "/auth/login",
          body: request.body,
        });
        return reply.status(status).send(data);
      } catch (err) {
        const status = upstreamErrorStatus(err);
        return reply
          .status(status)
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );

  // POST /auth/register — proxy para users
  typed.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Registrar usuário (proxy para users)",
        body: z.object({
          email: z.string(),
          password: z.string(),
          name: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      try {
        const { status, data } = await forwardToUsers({
          method: "POST",
          path: "/auth/register",
          body: request.body,
        });
        return reply.status(status).send(data);
      } catch (err) {
        const status = upstreamErrorStatus(err);
        return reply
          .status(status)
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );

  // POST /auth/refresh — proxy para users
  typed.post(
    "/refresh",
    {
      schema: {
        tags: ["auth"],
        summary: "Renovar access token (proxy para users)",
        body: z.object({ refreshToken: z.string() }),
      },
    },
    async (request, reply) => {
      try {
        const { status, data } = await forwardToUsers({
          method: "POST",
          path: "/auth/refresh",
          body: request.body,
        });
        return reply.status(status).send(data);
      } catch (err) {
        const status = upstreamErrorStatus(err);
        return reply
          .status(status)
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );

}

/**
 * GET /profile — proxy autenticado para users.
 * Registrado sem prefix (no server.ts, via profileHandler) para manter
 * o path idêntico ao expose em users.
 */
export async function profileHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/profile",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["auth"],
        summary: "Perfil do usuário autenticado (proxy para users)",
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      try {
        const { status, data } = await forwardToUsers({
          method: "GET",
          path: "/profile",
          authHeader: request.headers.authorization,
        });
        return reply.status(status).send(data);
      } catch (err) {
        const status = upstreamErrorStatus(err);
        return reply
          .status(status)
          .send({ error: (err as Error).message ?? "Upstream error" });
      }
    }
  );
}
