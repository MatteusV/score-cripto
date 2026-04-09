import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { publishWalletDataRequested } from "../../../events/publisher";
import type { AnalysisRequest } from "../../../generated/prisma/client";
import { AnalysisRequestPrismaRepository } from "../../../repositories/prisma/analysis-request-prisma-repository";
import { prisma } from "../../../services/database";
import { CreateAnalysisRequestUseCase } from "../../../use-cases/analysis-request/create-analysis-request-use-case";
import { FindActiveAnalysisRequestUseCase } from "../../../use-cases/analysis-request/find-active-analysis-request-use-case";
import { GetAnalysisRequestUseCase } from "../../../use-cases/analysis-request/get-analysis-request-use-case";
import { AnalysisRequestNotFoundError } from "../../../use-cases/errors/analysis-request-not-found-error";

const repository = new AnalysisRequestPrismaRepository(prisma);
const createUseCase = new CreateAnalysisRequestUseCase(repository);
const findActiveUseCase = new FindActiveAnalysisRequestUseCase(repository);
const getUseCase = new GetAnalysisRequestUseCase(repository);

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
      schema: {
        tags: ["analysis"],
        summary: "Iniciar análise de carteira",
        description:
          "Cria uma análise de confiabilidade para a carteira informada e inicia o pipeline assíncrono via evento `wallet.data.requested`. Use o `requestId` retornado para polling em `GET /analysis/:id`.",
        body: z.object({
          chain: z.string().min(1).describe("Identificador da rede blockchain"),
          address: z
            .string()
            .min(1)
            .describe("Endereço da carteira a ser analisada"),
          userId: z
            .string()
            .min(1)
            .describe("Identificador do usuário que solicita a análise"),
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
              status: z.literal("pending"),
            })
            .describe("Análise criada — pipeline iniciado"),
        },
      },
    },
    async (request, reply) => {
      const { chain, address, userId } = request.body;

      const existing = await findActiveUseCase.execute({
        userId,
        chain,
        address,
      });

      if (existing) {
        return reply.status(200).send({
          requestId: existing.id,
          status: existing.status.toLowerCase() as "pending" | "processing",
        });
      }

      const { analysisRequest } = await createUseCase.execute({
        userId,
        chain,
        address,
      });

      console.log(
        `EMITINDO: wallet.data.requested | requestId=${analysisRequest.id} chain=${chain} address=${address}`
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
    }
  );

  // GET /:id
  typed.get(
    "/:id",
    {
      schema: {
        tags: ["analysis"],
        summary: "Consultar status e resultado de uma análise",
        description:
          "Retorna o status atual da análise. Quando `status = completed`, inclui o campo `result` com o score e fatores da carteira. Recomenda-se polling a cada 2s até `completed` ou `failed`.",
        params: z.object({
          id: z.string().describe("ID da análise retornado no POST /analysis"),
        }),
        response: {
          200: z.object({
            requestId: z.string(),
            status: z
              .enum(["pending", "processing", "completed", "failed"])
              .describe(
                "pending: aguardando dados | processing: scoring em andamento | completed: resultado pronto | failed: erro no pipeline"
              ),
            chain: z.string(),
            address: z.string(),
            result: ScoreResultSchema.optional(),
          }),
          404: z
            .object({ error: z.string() })
            .describe("Análise não encontrada"),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      let analysisRequest: AnalysisRequest;
      try {
        ({ analysisRequest } = await getUseCase.execute({ id }));
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
