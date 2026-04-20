import { fastifyCors } from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import ScalarApiReference from "@scalar/fastify-api-reference";
import {
  getLoggerOptions,
  observabilityPlugin,
} from "@score-cripto/observability-node";
import fastify, { type FastifyError } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { adminHandler } from "./controllers/admin/routes.js";
import { analysisRequestHandler } from "./controllers/analysis-request/routes.js";
import { authHandler, profileHandler } from "./controllers/auth/routes.js";
import { billingHandler } from "./controllers/billing/routes.js";
import { exploreHandler } from "./controllers/explore/routes.js";
import { corsOriginCheck } from "./cors.js";
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
    origin: corsOriginCheck,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
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
        {
          name: "auth",
          description: "Autenticação e perfil do usuário",
        },
        {
          name: "billing",
          description: "Assinatura, checkout e webhook Stripe",
        },
        {
          name: "admin",
          description: "Operações administrativas (role=ADMIN)",
        },
        {
          name: "explore",
          description: "Descoberta de carteiras (trending, risk, leaderboard)",
        },
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

  // Raw body preservation escopado — necessário para Stripe webhook passthrough
  // em /billing/webhook (a assinatura HMAC do Stripe é sobre bytes crus).
  await app.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: false,
    runFirst: true,
  });

  await app.register(analysisRequestHandler, { prefix: "/analysis" });
  await app.register(authHandler, { prefix: "/auth" });
  await app.register(profileHandler);
  await app.register(billingHandler, { prefix: "/billing" });
  await app.register(adminHandler, { prefix: "/admin" });
  await app.register(exploreHandler, { prefix: "/explore" });

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
