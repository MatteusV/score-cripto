import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../config.js";
import { JwtServiceImpl } from "../../services/jwt-service.js";

const jwtService = new JwtServiceImpl(
  config.jwtPrivateKey,
  config.jwtPublicKey,
  config.jwtExpiresIn
);

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply
      .status(401)
      .send({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwtService.verify(token);
    request.user = { id: payload.sub, email: payload.email };
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user: { id: string; email: string };
  }
}
