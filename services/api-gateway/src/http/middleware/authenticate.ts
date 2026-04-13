import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";

interface JwtPayload {
  sub: string;
  email: string;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reply
      .status(401)
      .send({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtPublicKey, {
      algorithms: ["RS256"],
    }) as JwtPayload;
    request.user = { id: payload.sub, email: payload.email };
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user: { id: string; email: string };
  }
}
