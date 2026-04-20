import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { prisma } from "../../../services/database.js";
import { GetExploreDataUseCase } from "../../../use-cases/explore/get-explore-data-use-case.js";
import { authenticate } from "../../middleware/authenticate.js";

const useCase = new GetExploreDataUseCase(prisma);

const WalletSchema = z.object({
  chain: z.string(),
  address: z.string(),
  score: z.number(),
  confidence: z.number().nullable(),
  lookups: z.number(),
  lastAnalyzedAt: z.string(),
  reasoning: z.string().nullable(),
  riskFactors: z.array(z.string()),
});

const RecentSchema = z.object({
  id: z.string(),
  publicId: z.number().int().nullable(),
  chain: z.string(),
  address: z.string(),
  score: z.number().nullable(),
  requestedAt: z.string(),
});

const ChainDistSchema = z.object({
  chain: z.string(),
  pct: z.number(),
  count: z.number(),
});

const CategorySchema = z.object({
  id: z.string(),
  count: z.number(),
});

export async function exploreHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    "/",
    {
      preHandler: [authenticate],
      schema: {
        tags: ["explore"],
        summary: "Dados agregados para a tela Explorar",
        description:
          "Retorna trending wallets (últimos 7 dias, por lookups), leaderboard (score ≥ 80), risk list (score < 40), histórico recente do usuário, distribuição por chain e estatísticas globais.",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            trending: z.array(WalletSchema),
            risk: z.array(WalletSchema),
            leaderboard: z.array(WalletSchema),
            recent: z.array(RecentSchema),
            chainDistribution: z.array(ChainDistSchema),
            categories: z.array(CategorySchema),
            stats: z.object({
              totalAnalyses: z.number(),
              uniqueAddresses: z.number(),
              chains: z.number(),
              risky: z.number(),
            }),
          }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.id;
      const data = await useCase.execute(userId);
      return reply.status(200).send(data);
    }
  );
}
