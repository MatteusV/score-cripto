import { fastifyCors } from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import ScalarApiReference from "@scalar/fastify-api-reference";
import fastify from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod/v4";

export async function createHttpServer() {
  const app = fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifyCors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Score Cripto — Users Service",
        description:
          "Serviço de gerenciamento de usuários, autenticação, planos, billing e limites de uso.",
        version: "1.0.0",
      },
      tags: [
        { name: "auth", description: "Autenticação e registro de usuários" },
        { name: "usage", description: "Controle de consumo e limites mensais" },
        { name: "billing", description: "Integração com Stripe e assinaturas" },
        { name: "system", description: "Status e saúde do serviço" },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.setErrorHandler((error, _request, reply) => {
    const fastifyError = error as Error & { validation?: unknown };
    if (fastifyError.validation) {
      return reply.status(400).send({
        error: "Invalid body",
        details: fastifyError.validation,
      });
    }
    reply.send(error);
  });

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
    },
  );

  // Scalar precisa ser registrado após as rotas para que fastify.swagger() tenha o spec completo
  await app.register(ScalarApiReference, {
    routePrefix: "/docs",
  });

  return app;
}
