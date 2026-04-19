import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import type { AnalysisRequestDTO } from "../../../domain/analysis-request.js";
import { analysisEventBus } from "../../../events/analysis-event-bus.js";
import { publishWalletDataRequested } from "../../../events/publisher.js";
import { analysisRequestsCounter } from "../../../observability/metrics.js";
import { AnalysisRequestPrismaRepository } from "../../../repositories/prisma/analysis-request-prisma-repository.js";
import { AnalysisTranslationPrismaRepository } from "../../../repositories/prisma/analysis-translation-prisma-repository.js";
import { prisma } from "../../../services/database.js";
import {
  checkUsage,
  UsersServiceError,
} from "../../../services/users-service.js";
import { CreateAnalysisRequestUseCase } from "../../../use-cases/analysis-request/create-analysis-request-use-case.js";
import { FindActiveAnalysisRequestUseCase } from "../../../use-cases/analysis-request/find-active-analysis-request-use-case.js";
import { FindCachedAnalysisUseCase } from "../../../use-cases/analysis-request/find-cached-analysis-use-case.js";
import { GetAnalysisByPublicIdUseCase } from "../../../use-cases/analysis-request/get-analysis-by-public-id-use-case.js";
import { GetAnalysisRequestUseCase } from "../../../use-cases/analysis-request/get-analysis-request-use-case.js";
import { ListAnalysesUseCase } from "../../../use-cases/analysis-request/list-analyses-use-case.js";
import { AnalysisRequestNotFoundError } from "../../../use-cases/errors/analysis-request-not-found-error.js";
import { authenticate } from "../../middleware/authenticate.js";

const SSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

const repository = new AnalysisRequestPrismaRepository(prisma);
const translationRepository = new AnalysisTranslationPrismaRepository(prisma);
const createUseCase = new CreateAnalysisRequestUseCase(repository);
const findActiveUseCase = new FindActiveAnalysisRequestUseCase(repository);
const findCachedUseCase = new FindCachedAnalysisUseCase(repository);
const getByPublicIdUseCase = new GetAnalysisByPublicIdUseCase(repository);
const getUseCase = new GetAnalysisRequestUseCase(repository);
const listUseCase = new ListAnalysesUseCase(repository);

const ScoreResultSchema = z
  .object({
    score: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe(
        "Score de confiabilidade (0 = alto risco, 100 = alta confiança)"
      ),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confiança da IA no score gerado"),
    reasoning: z
      .string()
      .describe("Explicação textual do score gerado pela IA"),
    positiveFactors: z
      .array(z.string())
      .describe("Fatores que contribuíram positivamente para o score"),
    riskFactors: z
      .array(z.string())
      .describe("Fatores de risco identificados na carteira"),
    modelVersion: z.string().describe("Modelo de IA utilizado"),
    promptVersion: z.string().describe("Versão do prompt de scoring"),
  })
  .nullable()
  .describe("Presente apenas quando status = completed");

export async function analysisRequestHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // POST /
  typed.post(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["analysis"],
        summary: "Iniciar análise de carteira",
        description:
          "Cria uma análise de confiabilidade para a carteira informada e inicia o pipeline assíncrono via evento `wallet.data.requested`. Use o `requestId` retornado para polling em `GET /analysis/:id`. Requer autenticação JWT RS256.",
        security: [{ bearerAuth: [] }],
        body: z.object({
          chain: z.string().min(1).describe("Identificador da rede blockchain"),
          address: z
            .string()
            .min(1)
            .describe("Endereço da carteira a ser analisada"),
        }),
        response: {
          200: z
            .object({
              requestId: z.string(),
              status: z.enum(["pending", "processing"]),
            })
            .describe(
              "Análise em andamento já existente para este usuário+carteira"
            ),
          202: z
            .object({
              requestId: z
                .string()
                .describe("Use para polling em GET /analysis/:id"),
              publicId: z
                .number()
                .int()
                .describe("ID público incremental por usuário"),
              status: z.literal("pending"),
            })
            .describe("Análise criada — pipeline iniciado"),
          401: z.object({ error: z.string() }).describe("Não autenticado"),
          429: z
            .object({ error: z.string() })
            .describe("Limite de análises do plano atingido"),
        },
      },
    },
    async (request, reply) => {
      const { chain, address } = request.body;
      const userId = request.user.id;

      const existing = await findActiveUseCase.execute({
        userId,
        chain,
        address,
      });

      if (existing) {
        analysisRequestsCounter.add(1, { chain, status: "cached" });
        return reply.status(200).send({
          requestId: existing.id,
          status: existing.status.toLowerCase() as "pending" | "processing",
        });
      }

      try {
        await checkUsage(userId);
      } catch (err) {
        if (err instanceof UsersServiceError && err.statusCode === 429) {
          analysisRequestsCounter.add(1, { chain, status: "error" });
          return reply.status(429).send({
            error: "Usage limit exceeded for this billing period",
          });
        }
        const statusCode =
          err instanceof UsersServiceError ? err.statusCode : 503;
        const logFn =
          statusCode === 503 || statusCode === 504
            ? request.log.error.bind(request.log)
            : request.log.warn.bind(request.log);
        logFn(
          { err: (err as Error).message, statusCode },
          "users service fail-open: proceeding with analysis despite check failure"
        );
      }

      const { analysisRequest } = await createUseCase.execute({
        userId,
        chain,
        address,
      });

      request.log.info(
        { requestId: analysisRequest.id, chain },
        "wallet.data.requested event publishing"
      );

      publishWalletDataRequested({
        requestId: analysisRequest.id,
        userId,
        chain,
        address,
      });

      analysisRequestsCounter.add(1, { chain, status: "created" });
      return reply.status(202).send({
        requestId: analysisRequest.id,
        publicId: analysisRequest.publicId as number,
        status: "pending",
      });
    }
  );

  // GET / — lista paginada de análises do usuário autenticado
  typed.get(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["analysis"],
        summary: "Listar análises do usuário com summary e paginação",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            summary: z.object({
              total: z.number(),
              avgScore: z.number(),
              trusted: z.number(),
              attention: z.number(),
              risky: z.number(),
            }),
            data: z.array(
              z.object({
                id: z.string(),
                publicId: z.number().int().nullable().optional(),
                chain: z.string(),
                address: z.string(),
                score: z.number(),
                requestedAt: z.string(),
                completedAt: z.string(),
              })
            ),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
            }),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query as { page: number; limit: number };
      const userId = request.user.id;

      const result = await listUseCase.execute({ userId, page, limit });

      return reply.status(200).send({
        summary: result.summary,
        data: result.data.map((item) => ({
          id: item.id,
          publicId: item.publicId,
          chain: item.chain,
          address: item.address,
          score: item.score,
          requestedAt: item.requestedAt.toISOString(),
          completedAt: item.completedAt.toISOString(),
        })),
        pagination: result.pagination,
      });
    }
  );

  // GET /:id
  typed.get(
    "/:id",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["analysis"],
        summary: "Consultar status e resultado de uma análise",
        description:
          "Retorna o status atual da análise. Quando `status = completed`, inclui o campo `result` com o score e fatores da carteira. Recomenda-se polling a cada 2s até `completed` ou `failed`. Requer autenticação JWT RS256.",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().describe("ID da análise retornado no POST /analysis"),
        }),
        response: {
          200: z.object({
            requestId: z.string(),
            publicId: z.number().int().nullable().optional(),
            status: z
              .enum(["pending", "processing", "completed", "failed"])
              .describe(
                "pending: aguardando dados | processing: scoring em andamento | completed: resultado pronto | failed: erro no pipeline"
              ),
            chain: z.string(),
            address: z.string(),
            result: ScoreResultSchema.optional(),
          }),
          401: z.object({ error: z.string() }).describe("Não autenticado"),
          404: z
            .object({ error: z.string() })
            .describe("Análise não encontrada"),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      let analysisRequest: AnalysisRequestDTO;
      try {
        ({ analysisRequest } = await getUseCase.execute({
          id,
          userId: request.user.id,
        }));
      } catch (err) {
        if (err instanceof AnalysisRequestNotFoundError) {
          return reply
            .status(404)
            .send({ error: "Analysis request not found" });
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
        publicId: analysisRequest.publicId,
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
          score: analysisRequest.score as number,
          confidence: analysisRequest.confidence as number,
          reasoning: analysisRequest.reasoning as string,
          positiveFactors: analysisRequest.positiveFactors as string[],
          riskFactors: analysisRequest.riskFactors as string[],
          modelVersion: analysisRequest.modelVersion as string,
          promptVersion: analysisRequest.promptVersion as string,
        },
      });
    }
  );

  // GET /:id/stream — SSE: aguarda completion e envia evento único
  app.get(
    "/:id/stream",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verifica se análise existe, é do usuário autenticado e já terminou
      let analysis: AnalysisRequestDTO | null = null;
      try {
        ({ analysisRequest: analysis } = await getUseCase.execute({
          id,
          userId: request.user.id,
        }));
      } catch (err) {
        if (err instanceof AnalysisRequestNotFoundError) {
          return reply
            .status(404)
            .send({ error: "Analysis request not found" });
        }
        throw err;
      }

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders();

      const sendEvent = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      // Status imediato
      const currentStatus = analysis.status.toLowerCase();
      sendEvent("status", { status: currentStatus });

      // Se já terminou, envia resultado e fecha
      if (analysis.status === "COMPLETED") {
        sendEvent("result", {
          status: "completed",
          result: {
            score: analysis.score,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            positiveFactors: analysis.positiveFactors,
            riskFactors: analysis.riskFactors,
            modelVersion: analysis.modelVersion,
            promptVersion: analysis.promptVersion,
          },
        });
        reply.raw.end();
        return;
      }

      if (analysis.status === "FAILED") {
        sendEvent("result", { status: "failed", error: "Analysis failed" });
        reply.raw.end();
        return;
      }

      // Aguarda evento do bus in-process
      return new Promise<void>((resolve) => {
        const cleanup = (closeStream = true) => {
          clearTimeout(timer);
          analysisEventBus.off(id, onDone);
          if (closeStream) {
            reply.raw.end();
          }
          resolve();
        };

        const onDone = (event: {
          status: "completed" | "failed";
          result?: unknown;
          error?: string;
        }) => {
          sendEvent("result", event);
          cleanup();
        };

        const timer = setTimeout(() => {
          sendEvent("timeout", {
            message: "SSE timeout — use polling fallback",
          });
          cleanup();
        }, SSE_TIMEOUT_MS);

        analysisEventBus.once(id, onDone);

        // Cleanup quando cliente desconectar
        request.raw.on("close", () => cleanup(false));
      });
    }
  );

  // GET /by-wallet?chain=X&address=Y — busca análise em cache por carteira
  typed.get(
    "/by-wallet",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["analysis"],
        summary: "Buscar análise em cache por chain+address",
        description:
          "Retorna análise existente válida para a carteira informada. Use antes de criar uma nova análise para evitar chamadas desnecessárias à IA.",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          chain: z.string().min(1),
          address: z.string().min(1),
        }),
        response: {
          200: z.object({
            requestId: z.string(),
            publicId: z.number().int().nullable().optional(),
            status: z.enum(["pending", "processing", "completed"]),
            chain: z.string(),
            address: z.string(),
            result: ScoreResultSchema.optional(),
          }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { chain, address } = request.query as {
        chain: string;
        address: string;
      };
      const userId = request.user.id;

      const found = await findCachedUseCase.execute({ userId, chain, address });

      if (found.kind === "miss") {
        return reply.status(404).send({ error: "No cached analysis found" });
      }

      const { analysisRequest } = found;
      const status = analysisRequest.status.toLowerCase() as
        | "pending"
        | "processing"
        | "completed";

      const base = {
        requestId: analysisRequest.id,
        publicId: analysisRequest.publicId,
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
          score: analysisRequest.score as number,
          confidence: analysisRequest.confidence as number,
          reasoning: analysisRequest.reasoning as string,
          positiveFactors: analysisRequest.positiveFactors as string[],
          riskFactors: analysisRequest.riskFactors as string[],
          modelVersion: analysisRequest.modelVersion as string,
          promptVersion: analysisRequest.promptVersion as string,
        },
      });
    }
  );

  // GET /:id/translations/:locale — busca tradução cacheada
  typed.get(
    "/:id/translations/:locale",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["analysis"],
        summary: "Buscar tradução cacheada de uma análise",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
          locale: z.string().min(2),
        }),
        response: {
          200: z.object({
            locale: z.string(),
            reasoning: z.string().nullable(),
            positiveFactors: z.array(z.string()).nullable(),
            riskFactors: z.array(z.string()).nullable(),
            translatedAt: z.string(),
          }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id, locale } = request.params as { id: string; locale: string };

      try {
        await getUseCase.execute({ id, userId: request.user.id });
      } catch (err) {
        if (err instanceof AnalysisRequestNotFoundError) {
          return reply.status(404).send({ error: "No translation found" });
        }
        throw err;
      }

      const translation = await translationRepository.findTranslation(
        id,
        locale
      );
      if (!translation) {
        return reply.status(404).send({ error: "No translation found" });
      }

      return reply.status(200).send({
        locale: translation.locale,
        reasoning: translation.reasoning,
        positiveFactors: translation.positiveFactors as string[] | null,
        riskFactors: translation.riskFactors as string[] | null,
        translatedAt: translation.translatedAt.toISOString(),
      });
    }
  );

  // PUT /:id/translations/:locale — salva/atualiza tradução
  typed.put(
    "/:id/translations/:locale",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["analysis"],
        summary: "Salvar tradução de uma análise",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string(),
          locale: z.string().min(2),
        }),
        body: z.object({
          reasoning: z.string().nullable(),
          positiveFactors: z.array(z.string()).nullable(),
          riskFactors: z.array(z.string()).nullable(),
        }),
        response: {
          200: z.object({
            locale: z.string(),
            reasoning: z.string().nullable(),
            positiveFactors: z.array(z.string()).nullable(),
            riskFactors: z.array(z.string()).nullable(),
            translatedAt: z.string(),
          }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id, locale } = request.params as { id: string; locale: string };
      const { reasoning, positiveFactors, riskFactors } = request.body;

      try {
        await getUseCase.execute({ id, userId: request.user.id });
      } catch (err) {
        if (err instanceof AnalysisRequestNotFoundError) {
          return reply
            .status(404)
            .send({ error: "Analysis request not found" });
        }
        throw err;
      }

      const translation = await translationRepository.upsertTranslation({
        analysisId: id,
        locale,
        reasoning,
        positiveFactors,
        riskFactors,
      });

      return reply.status(200).send({
        locale: translation.locale,
        reasoning: translation.reasoning,
        positiveFactors: translation.positiveFactors as string[] | null,
        riskFactors: translation.riskFactors as string[] | null,
        translatedAt: translation.translatedAt.toISOString(),
      });
    }
  );

  // GET /p/:publicId — busca análise histórica pelo ID público do usuário
  typed.get(
    "/p/:publicId",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["analysis"],
        summary: "Buscar análise histórica pelo ID público",
        description:
          "Retorna análise identificada pelo publicId incremental do usuário. Usado para abrir análises do histórico via URL.",
        security: [{ bearerAuth: [] }],
        params: z.object({
          publicId: z.coerce.number().int().positive(),
        }),
        response: {
          200: z.object({
            requestId: z.string(),
            publicId: z.number().int().nullable().optional(),
            status: z.enum(["pending", "processing", "completed", "failed"]),
            chain: z.string(),
            address: z.string(),
            result: ScoreResultSchema.optional(),
          }),
          401: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { publicId } = request.params as { publicId: number };
      const userId = request.user.id;

      let analysisRequest: AnalysisRequestDTO;
      try {
        ({ analysisRequest } = await getByPublicIdUseCase.execute({
          userId,
          publicId,
        }));
      } catch (err) {
        if (err instanceof AnalysisRequestNotFoundError) {
          return reply
            .status(404)
            .send({ error: "Analysis request not found" });
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
        publicId: analysisRequest.publicId,
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
          score: analysisRequest.score as number,
          confidence: analysisRequest.confidence as number,
          reasoning: analysisRequest.reasoning as string,
          positiveFactors: analysisRequest.positiveFactors as string[],
          riskFactors: analysisRequest.riskFactors as string[],
          modelVersion: analysisRequest.modelVersion as string,
          promptVersion: analysisRequest.promptVersion as string,
        },
      });
    }
  );
}
