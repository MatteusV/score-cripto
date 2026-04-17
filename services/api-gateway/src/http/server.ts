import { fastifyCors } from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import ScalarApiReference from "@scalar/fastify-api-reference";
import {
  getLoggerOptions,
  observabilityPlugin,
} from "@score-cripto/observability-node";
import fastify, { type FastifyError } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { adminHandler } from "./controllers/admin/routes.js";
import { analysisRequestHandler } from "./controllers/analysis-request/routes.js";
import { registerRateLimit } from "./plugins/rate-limit.js";

export async function createHttpServer() {
  const app = fastify({
    logger: getLoggerOptions({ service: "api-gateway" }),
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "correlationId",
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  await app.register(observabilityPlugin);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await registerRateLimit(app);

  app.register(fastifyCors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    // credentials: true,
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Score Cripto — API Gateway",
        description:
          "Boundary externo único da plataforma. Todos os clientes devem usar somente este serviço para iniciar e consultar análises de carteiras blockchain.",
        version: "1.0.0",
      },
      tags: [
        {
          name: "analysis",
          description: "Análise de confiabilidade de carteiras",
        },
        { name: "admin", description: "Operações administrativas (role=ADMIN)" },
        { name: "system", description: "Status e saúde do serviço" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: "Invalid body",
        details: error.validation,
      });
    }
    reply.send(error);
  });

  await app.register(analysisRequestHandler, { prefix: "/analysis" });
  await app.register(adminHandler, { prefix: "/admin" });

  // GET /health
  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Health check",
        response: {
          200: z.object({ status: z.literal("ok") }),
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({ status: "ok" });
    }
  );

  // Scalar precisa ser registrado após as rotas para que fastify.swagger() tenha o spec completo
  await app.register(ScalarApiReference, {
    routePrefix: "/docs",
  });

  return app;
}
