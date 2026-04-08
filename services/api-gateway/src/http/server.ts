import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
import { z } from "zod";
import { publishWalletDataRequested } from "../events/publisher.js";
import { AnalysisRequestPrismaRepository } from "../repositories/prisma/analysis-request-prisma-repository.js";
import { prisma } from "../services/database.js";
import { CreateAnalysisRequestUseCase } from "../use-cases/analysis-request/create-analysis-request-use-case.js";
import { FindActiveAnalysisRequestUseCase } from "../use-cases/analysis-request/find-active-analysis-request-use-case.js";
import { GetAnalysisRequestUseCase } from "../use-cases/analysis-request/get-analysis-request-use-case.js";
import { AnalysisRequestNotFoundError } from "../use-cases/errors/analysis-request-not-found-error.js";

const PostAnalysisBodySchema = z.object({
  chain: z.string().min(1),
  address: z.string().min(1),
  userId: z.string().min(1),
});

export async function createHttpServer() {
  const app = fastify({ logger: false });

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
        { name: "system", description: "Status e saúde do serviço" },
      ],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: true,
    },
    staticCSP: true,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: "Invalid body",
        details: error.validation,
      });
    }
    reply.send(error);
  });

  const repository = new AnalysisRequestPrismaRepository(prisma);
  const createUseCase = new CreateAnalysisRequestUseCase(repository);
  const findActiveUseCase = new FindActiveAnalysisRequestUseCase(repository);
  const getUseCase = new GetAnalysisRequestUseCase(repository);

  // POST /analysis
  app.post(
    "/analysis",
    {
      schema: {
        tags: ["analysis"],
        summary: "Iniciar análise de carteira",
        description:
          "Cria uma análise de confiabilidade para a carteira informada e inicia o pipeline assíncrono via evento `wallet.data.requested`. Use o `requestId` retornado para polling em `GET /analysis/:id`.",
        body: {
          type: "object",
          required: ["chain", "address", "userId"],
          properties: {
            chain: {
              type: "string",
              minLength: 1,
              description: "Identificador da rede blockchain",
              examples: ["ethereum", "bitcoin", "polygon", "solana"],
            },
            address: {
              type: "string",
              minLength: 1,
              description: "Endereço da carteira a ser analisada",
              examples: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"],
            },
            userId: {
              type: "string",
              minLength: 1,
              description: "Identificador do usuário que solicita a análise",
              examples: ["user-abc-123"],
            },
          },
        },
        response: {
          202: {
            description: "Análise criada — pipeline iniciado",
            type: "object",
            properties: {
              requestId: {
                type: "string",
                description: "Use para polling em GET /analysis/:id",
              },
              status: { type: "string", enum: ["pending"] },
            },
          },
          200: {
            description:
              "Análise em andamento já existente para este usuário+carteira",
            type: "object",
            properties: {
              requestId: { type: "string" },
              status: { type: "string", enum: ["pending", "processing"] },
            },
          },
          400: {
            description: "Body inválido",
            type: "object",
            properties: {
              error: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = PostAnalysisBodySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid body",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { chain, address, userId } = parsed.data;

      const existing = await findActiveUseCase.execute({ userId, chain, address });

      if (existing) {
        return reply.status(200).send({
          requestId: existing.id,
          status: existing.status.toLowerCase(),
        });
      }

      const { analysisRequest } = await createUseCase.execute({ userId, chain, address });

      console.log(
        `EMITINDO: wallet.data.requested | requestId=${analysisRequest.id} chain=${chain} address=${address}`,
      );

      publishWalletDataRequested({
        requestId: analysisRequest.id,
        userId,
        chain,
        address,
      });

      return reply.status(202).send({
        requestId: analysisRequest.id,
        status: "pending",
      });
    },
  );

  // GET /analysis/:id
  app.get(
    "/analysis/:id",
    {
      schema: {
        tags: ["analysis"],
        summary: "Consultar status e resultado de uma análise",
        description:
          "Retorna o status atual da análise. Quando `status = completed`, inclui o campo `result` com o score e fatores da carteira. Recomenda-se polling a cada 2s até `completed` ou `failed`.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              description: "ID da análise retornado no POST /analysis",
            },
          },
        },
        response: {
          200: {
            description: "Status atual da análise",
            type: "object",
            properties: {
              requestId: { type: "string" },
              status: {
                type: "string",
                enum: ["pending", "processing", "completed", "failed"],
                description:
                  "pending: aguardando dados | processing: scoring em andamento | completed: resultado pronto | failed: erro no pipeline",
              },
              chain: { type: "string" },
              address: { type: "string" },
              result: {
                type: "object",
                nullable: true,
                description: "Presente apenas quando status = completed",
                properties: {
                  score: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                    description:
                      "Score de confiabilidade (0 = alto risco, 100 = alta confiança)",
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Confiança da IA no score gerado",
                  },
                  reasoning: {
                    type: "string",
                    description: "Explicação textual do score gerado pela IA",
                  },
                  positiveFactors: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Fatores que contribuíram positivamente para o score",
                  },
                  riskFactors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Fatores de risco identificados na carteira",
                  },
                  modelVersion: {
                    type: "string",
                    description: "Modelo de IA utilizado",
                  },
                  promptVersion: {
                    type: "string",
                    description: "Versão do prompt de scoring",
                  },
                },
              },
            },
          },
          404: {
            description: "Análise não encontrada",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      let analysisRequest;
      try {
        ({ analysisRequest } = await getUseCase.execute({ id }));
      } catch (err) {
        if (err instanceof AnalysisRequestNotFoundError) {
          return reply.status(404).send({ error: "Analysis request not found" });
        }
        throw err;
      }

      const status = analysisRequest.status.toLowerCase() as
        | "pending"
        | "processing"
        | "completed"
        | "failed";

      const base = {
        requestId: analysisRequest.id,
        status,
        chain: analysisRequest.chain,
        address: analysisRequest.address,
      };

      if (analysisRequest.status !== "COMPLETED") {
        return reply.status(200).send(base);
      }

      return reply.status(200).send({
        ...base,
        result: {
          score: analysisRequest.score,
          confidence: analysisRequest.confidence,
          reasoning: analysisRequest.reasoning,
          positiveFactors: analysisRequest.positiveFactors,
          riskFactors: analysisRequest.riskFactors,
          modelVersion: analysisRequest.modelVersion,
          promptVersion: analysisRequest.promptVersion,
        },
      });
    },
  );

  // GET /health
  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Health check",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["ok"] },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({ status: "ok" });
    },
  );

  return app;
}
