import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";

const SKIP_PATHS = new Set(["/health"]);

/**
 * Determina a chave de rate limit para a requisição.
 * - Token JWT válido → `user:<sub>` (bucket por usuário)
 * - Sem token ou token inválido → `ip:<req.ip>` (bucket por IP)
 */
export function buildKeyGenerator(
  jwtPublicKey: string
): (req: FastifyRequest) => string {
  return (req: FastifyRequest): string => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(auth.slice(7), jwtPublicKey, {
          algorithms: ["RS256"],
        }) as { sub: string };
        return `user:${payload.sub}`;
      } catch {
        /* token inválido → cai em IP */
      }
    }
    return `ip:${req.ip}`;
  };
}

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  const keyGenerator = buildKeyGenerator(config.jwtPublicKey);

  await app.register(rateLimit, {
    max: (_req, key) =>
      key.startsWith("user:")
        ? config.rateLimitMaxAuth
        : config.rateLimitMaxAnon,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator,
    allowList: (req) => SKIP_PATHS.has(req.url) || req.url.startsWith("/docs"),
  });
}
