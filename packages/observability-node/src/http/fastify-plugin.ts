import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { observabilityStorage } from "../context.js";

/**
 * Fastify plugin that wires up correlation ID propagation:
 *
 * - Reads X-Request-Id from incoming request (Fastify sets req.id from it
 *   when requestIdHeader is configured; plugin expects that to already be set)
 * - Echoes the correlation ID back in the X-Request-Id response header
 * - Populates AsyncLocalStorage so AMQP publishers can read correlationId
 *   without threading it through every function call
 */
export const observabilityPlugin = fp(
  async (app: FastifyInstance) => {
    // Echo X-Request-Id back to client
    app.addHook("onSend", async (request, reply) => {
      void reply.header("x-request-id", request.id);
    });

    // Populate AsyncLocalStorage for the lifetime of this request's async chain
    app.addHook("onRequest", (request, _reply, done) => {
      observabilityStorage.run({ correlationId: request.id }, done);
    });
  },
  { name: "score-cripto-observability" },
);
