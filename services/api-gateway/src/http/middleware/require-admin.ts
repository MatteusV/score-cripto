import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.user?.role !== "ADMIN") {
    reply.status(403).send({ error: "Forbidden: admin access required" });
  }
}
