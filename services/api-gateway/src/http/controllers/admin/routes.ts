import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { AnalysisRequestPrismaRepository } from "../../../repositories/prisma/analysis-request-prisma-repository.js";
import { prisma } from "../../../services/database.js";
import { FailAnalysisRequestUseCase } from "../../../use-cases/analysis-request/fail-analysis-request-use-case.js";
import { ListAllAnalysesUseCase } from "../../../use-cases/analysis-request/list-all-analyses-use-case.js";
import { AnalysisRequestNotFoundError } from "../../../use-cases/errors/analysis-request-not-found-error.js";
import { authenticate } from "../../middleware/authenticate.js";
import { requireAdmin } from "../../middleware/require-admin.js";

const repository = new AnalysisRequestPrismaRepository(prisma);
const listAllUseCase = new ListAllAnalysesUseCase(repository);
const failUseCase = new FailAnalysisRequestUseCase(repository);

const AnalysisItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  publicId: z.number().int().nullable(),
  chain: z.string(),
  address: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  score: z.number().int().nullable(),
  confidence: z.number().nullable(),
  requestedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  failureReason: z.string().nullable(),
  modelVersion: z.string().nullable(),
  promptVersion: z.string().nullable(),
});

export async function adminHandler(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // GET /admin/analyses — lista todas as análises (paginado, filtrável)
  typed.get(
    "/analyses",
    {
      preHandler: [authenticate, requireAdmin],
      schema: {
        tags: ["admin"],
        summary: "Lista todas as análises (admin)",
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          status: z
            .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
            .optional(),
          userId: z.string().optional(),
        }),
        response: {
          200: z.object({
            items: z.array(AnalysisItemSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { page, limit, status, userId } = request.query;
      const result = await listAllUseCase.execute({ page, limit, status, userId });

      return reply.status(200).send({
        total: result.total,
        page: result.page,
        limit: result.limit,
        items: result.items.map((item) => ({
          id: item.id,
          userId: item.userId,
          publicId: item.publicId,
          chain: item.chain,
          address: item.address,
          status: item.status as "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
          score: item.score,
          confidence: item.confidence,
          requestedAt: item.requestedAt.toISOString(),
          completedAt: item.completedAt?.toISOString() ?? null,
          failedAt: item.failedAt?.toISOString() ?? null,
          failureReason: item.failureReason,
          modelVersion: item.modelVersion,
          promptVersion: item.promptVersion,
        })),
      });
    }
  );

  // GET /admin/stats — estatísticas globais
  typed.get(
    "/stats",
    {
      preHandler: [authenticate, requireAdmin],
      schema: {
        tags: ["admin"],
        summary: "Estatísticas globais de análises (admin)",
        response: {
          200: z.object({
            total: z.number().int(),
            pending: z.number().int(),
            processing: z.number().int(),
            completed: z.number().int(),
            failed: z.number().int(),
          }),
        },
      },
    },
    async (_request, reply) => {
      const [total, pending, processing, completed, failed] = await Promise.all([
        prisma.analysisRequest.count(),
        prisma.analysisRequest.count({ where: { status: "PENDING" } }),
        prisma.analysisRequest.count({ where: { status: "PROCESSING" } }),
        prisma.analysisRequest.count({ where: { status: "COMPLETED" } }),
        prisma.analysisRequest.count({ where: { status: "FAILED" } }),
      ]);

      return reply.status(200).send({ total, pending, processing, completed, failed });
    }
  );

  // POST /admin/analyses/:id/expire — força expiração manual de uma análise
  typed.post(
    "/analyses/:id/expire",
    {
      preHandler: [authenticate, requireAdmin],
      schema: {
        tags: ["admin"],
        summary: "Expira manualmente uma análise (admin)",
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ id: z.string().uuid(), status: z.literal("FAILED") }),
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await repository.findById(id);
      if (!existing) {
        return reply.status(404).send({ error: "Analysis not found" });
      }

      if (existing.status !== "PENDING" && existing.status !== "PROCESSING") {
        return reply.status(409).send({
          error: `Cannot expire analysis in status ${existing.status}`,
        });
      }

      try {
        const updated = await failUseCase.execute({
          id,
          reason: "Manually expired by admin",
        });
        return reply.status(200).send({ id: updated.analysisRequest.id, status: "FAILED" });
      } catch (err) {
        if (err instanceof AnalysisRequestNotFoundError) {
          return reply.status(404).send({ error: "Analysis not found" });
        }
        throw err;
      }
    }
  );
}
