import { createHash } from "node:crypto";
import fastify from "fastify";
import { z } from "zod";
import { publishWalletDataRequested } from "../events/publisher.js";
import { prisma } from "../services/database.js";

const PostAnalysisBodySchema = z.object({
  chain: z.string().min(1),
  address: z.string().min(1),
  userId: z.string().min(1),
});

export function createHttpServer() {
  const app = fastify({ logger: false });

  app.post("/analysis", async (request, reply) => {
    const parsed = PostAnalysisBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { chain, address, userId } = parsed.data;

    // Verifica se já existe request pendente/processing para este usuário+carteira
    const existing = await prisma.analysisRequest.findFirst({
      where: {
        userId,
        chain,
        address,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      orderBy: { requestedAt: "desc" },
    });

    if (existing) {
      return reply.status(200).send({
        requestId: existing.id,
        status: existing.status.toLowerCase(),
      });
    }

    const analysisRequest = await prisma.analysisRequest.create({
      data: { userId, chain, address, status: "PENDING" },
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

    // walletContextHash reservado para uso futuro (deduplicação cross-user)
    void createHash("sha256").update(`${chain}:${address}`).digest("hex");

    return reply.status(202).send({
      requestId: analysisRequest.id,
      status: "pending",
    });
  });

  app.get<{ Params: { id: string } }>("/analysis/:id", async (request, reply) => {
    const { id } = request.params;

    const analysisRequest = await prisma.analysisRequest.findUnique({
      where: { id },
    });

    if (!analysisRequest) {
      return reply.status(404).send({ error: "Analysis request not found" });
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
  });

  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  app.get("/docs", async (_request, reply) => {
    return reply.status(200).send({
      service: "api-gateway",
      version: "1.0.0",
      description: "Boundary externo da plataforma Score Cripto. Todos os clientes devem usar somente este serviço.",
      endpoints: [
        {
          method: "POST",
          path: "/analysis",
          description: "Inicia uma análise de confiabilidade para uma carteira blockchain. Publica o evento wallet.data.requested para o pipeline assíncrono.",
          request: {
            contentType: "application/json",
            body: {
              chain: {
                type: "string",
                required: true,
                example: "ethereum",
                description: "Identificador da rede blockchain (ethereum, bitcoin, polygon, solana...)",
              },
              address: {
                type: "string",
                required: true,
                example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                description: "Endereço da carteira a ser analisada",
              },
              userId: {
                type: "string",
                required: true,
                example: "user-abc-123",
                description: "Identificador do usuário que está solicitando a análise",
              },
            },
          },
          responses: {
            "202": {
              description: "Análise criada com sucesso e pipeline iniciado",
              body: {
                requestId: { type: "string", example: "clxyz123abc", description: "ID único da análise — usar para polling" },
                status: { type: "string", enum: ["pending"], description: "Status inicial da análise" },
              },
            },
            "200": {
              description: "Já existe uma análise em andamento para esta carteira e usuário",
              body: {
                requestId: { type: "string", example: "clxyz123abc" },
                status: { type: "string", enum: ["pending", "processing"] },
              },
            },
            "400": {
              description: "Body inválido",
              body: {
                error: { type: "string", example: "Invalid body" },
                details: { type: "object", description: "Detalhes dos campos com erro" },
              },
            },
            "500": { description: "Erro interno do servidor" },
          },
        },
        {
          method: "GET",
          path: "/analysis/:id",
          description: "Consulta o status e resultado de uma análise. Use para polling periódico até status = completed ou failed.",
          request: {
            params: {
              id: {
                type: "string",
                required: true,
                example: "clxyz123abc",
                description: "ID da análise retornado no POST /analysis",
              },
            },
          },
          responses: {
            "200": {
              description: "Status atual da análise",
              body: {
                requestId: { type: "string" },
                status: {
                  type: "string",
                  enum: ["pending", "processing", "completed", "failed"],
                  description: "pending: aguardando dados | processing: processando score | completed: score pronto | failed: erro no pipeline",
                },
                chain: { type: "string" },
                address: { type: "string" },
                result: {
                  type: "object | null",
                  description: "Presente apenas quando status = completed",
                  fields: {
                    score: { type: "integer", range: "0-100", description: "Score de confiabilidade da carteira" },
                    confidence: { type: "float", range: "0.0-1.0", description: "Confiança da IA no score gerado" },
                    reasoning: { type: "string", description: "Explicação textual do score" },
                    positiveFactors: { type: "string[]", description: "Fatores que contribuíram positivamente" },
                    riskFactors: { type: "string[]", description: "Fatores de risco identificados" },
                    modelVersion: { type: "string", example: "gpt-4o-mini", description: "Modelo de IA usado" },
                    promptVersion: { type: "string", example: "v1.0", description: "Versão do prompt usado" },
                  },
                },
              },
            },
            "404": {
              description: "Análise não encontrada",
              body: { error: { type: "string", example: "Analysis request not found" } },
            },
            "500": { description: "Erro interno do servidor" },
          },
          pollingRecommendation: {
            intervalMs: 2000,
            maxAttempts: 30,
            stopWhen: ["completed", "failed"],
          },
        },
        {
          method: "GET",
          path: "/health",
          description: "Health check do serviço",
          request: {},
          responses: {
            "200": {
              body: { status: { type: "string", enum: ["ok"] } },
            },
          },
        },
        {
          method: "GET",
          path: "/docs",
          description: "Esta documentação",
          request: {},
          responses: {
            "200": { body: { description: "Objeto de documentação completo" } },
          },
        },
      ],
      events: {
        published: [
          {
            routingKey: "wallet.data.requested",
            description: "Publicado ao criar uma nova análise. Dispara o pipeline de coleta de dados.",
            payload: {
              event: "wallet.data.requested",
              schemaVersion: "1",
              timestamp: "ISO8601",
              data: {
                requestId: "string",
                userId: "string",
                chain: "string",
                address: "string",
              },
            },
          },
        ],
        consumed: [
          {
            routingKey: "wallet.score.calculated",
            description: "Recebido quando process-data-ia conclui o scoring. Atualiza o status para COMPLETED com o resultado inline.",
          },
          {
            routingKey: "wallet.score.failed",
            description: "Recebido quando process-data-ia falha no scoring. Atualiza o status para FAILED.",
          },
        ],
      },
    });
  });

  return app;
}
