import type {
  AnalysisRequest,
  AnalysisTranslation,
  PrismaClient,
} from "../../generated/prisma/client";
import type { AnalysisSummary } from "../../use-cases/analysis-request/list-analyses-use-case";
import type {
  AnalysisRequestRepository,
  CompleteAnalysisRequestData,
  CreateAnalysisRequestData,
  UpsertTranslationData,
} from "../analysis-request-repository";

export class AnalysisRequestPrismaRepository
  implements AnalysisRequestRepository
{
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async create(data: CreateAnalysisRequestData): Promise<AnalysisRequest> {
    return await this.prisma.analysisRequest.create({
      data: {
        userId: data.userId,
        chain: data.chain,
        address: data.address,
        status: "PENDING",
      },
    });
  }

  async createWithPublicId(
    data: CreateAnalysisRequestData
  ): Promise<AnalysisRequest> {
    return await this.prisma.$transaction(async (tx) => {
      const counter = await tx.userAnalysisCounter.upsert({
        where: { userId: data.userId },
        update: { counter: { increment: 1 } },
        create: { userId: data.userId, counter: 1 },
      });

      return tx.analysisRequest.create({
        data: {
          userId: data.userId,
          chain: data.chain,
          address: data.address,
          status: "PENDING",
          publicId: counter.counter,
        },
      });
    });
  }

  async findByUserChainAddress(
    userId: string,
    chain: string,
    address: string
  ): Promise<AnalysisRequest | null> {
    const result = await this.prisma.analysisRequest.findFirst({
      where: { userId, chain, address },
      orderBy: { requestedAt: "desc" },
    });

    return result ?? null;
  }

  async findByUserIdAndPublicId(
    userId: string,
    publicId: number
  ): Promise<AnalysisRequest | null> {
    const result = await this.prisma.analysisRequest.findUnique({
      where: { userId_publicId: { userId, publicId } },
    });

    return result ?? null;
  }

  async findActive(
    userId: string,
    chain: string,
    address: string
  ): Promise<AnalysisRequest | null> {
    const result = await this.prisma.analysisRequest.findFirst({
      where: {
        userId,
        chain,
        address,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      orderBy: { requestedAt: "desc" },
    });

    return result ?? null;
  }

  async findById(id: string): Promise<AnalysisRequest | null> {
    const result = await this.prisma.analysisRequest.findUnique({
      where: { id },
    });

    return result ?? null;
  }

  async markCompleted(
    id: string,
    result: CompleteAnalysisRequestData
  ): Promise<AnalysisRequest> {
    return await this.prisma.analysisRequest.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        score: result.score,
        confidence: result.confidence,
        reasoning: result.reasoning,
        positiveFactors: result.positiveFactors,
        riskFactors: result.riskFactors,
        modelVersion: result.modelVersion,
        promptVersion: result.promptVersion,
      },
    });
  }

  async markFailed(id: string, reason: string): Promise<AnalysisRequest> {
    return await this.prisma.analysisRequest.update({
      where: { id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: reason,
      },
    });
  }

  async listByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: AnalysisRequest[]; total: number }> {
    const where = { userId, status: "COMPLETED" as const };

    const [items, total] = await Promise.all([
      this.prisma.analysisRequest.findMany({
        where,
        orderBy: { completedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          userId: true,
          publicId: true,
          chain: true,
          address: true,
          status: true,
          score: true,
          confidence: true,
          reasoning: true,
          positiveFactors: true,
          riskFactors: true,
          modelVersion: true,
          promptVersion: true,
          requestedAt: true,
          completedAt: true,
          failedAt: true,
          failureReason: true,
        },
      }),
      this.prisma.analysisRequest.count({ where }),
    ]);

    return { items, total };
  }

  async findTranslation(
    analysisId: string,
    locale: string
  ): Promise<AnalysisTranslation | null> {
    return this.prisma.analysisTranslation.findUnique({
      where: { analysisId_locale: { analysisId, locale } },
    });
  }

  async upsertTranslation(
    data: UpsertTranslationData
  ): Promise<AnalysisTranslation> {
    return this.prisma.analysisTranslation.upsert({
      where: {
        analysisId_locale: { analysisId: data.analysisId, locale: data.locale },
      },
      update: {
        reasoning: data.reasoning,
        positiveFactors: data.positiveFactors ?? undefined,
        riskFactors: data.riskFactors ?? undefined,
        translatedAt: new Date(),
      },
      create: {
        analysisId: data.analysisId,
        locale: data.locale,
        reasoning: data.reasoning,
        positiveFactors: data.positiveFactors ?? undefined,
        riskFactors: data.riskFactors ?? undefined,
      },
    });
  }

  async summarizeByUserId(
    userId: string
  ): Promise<{ summary: AnalysisSummary }> {
    const where = { userId, status: "COMPLETED" as const };

    const [total, agg] = await Promise.all([
      this.prisma.analysisRequest.count({ where }),
      this.prisma.analysisRequest.aggregate({
        where,
        _avg: { score: true },
        _count: true,
      }),
    ]);

    if (total === 0) {
      return {
        summary: { total: 0, avgScore: 0, trusted: 0, attention: 0, risky: 0 },
      };
    }

    const [trusted, attention, risky] = await Promise.all([
      this.prisma.analysisRequest.count({
        where: { ...where, score: { gte: 70 } },
      }),
      this.prisma.analysisRequest.count({
        where: { ...where, score: { gte: 40, lt: 70 } },
      }),
      this.prisma.analysisRequest.count({
        where: { ...where, score: { lt: 40 } },
      }),
    ]);

    return {
      summary: {
        total,
        avgScore: Math.round(agg._avg.score ?? 0),
        trusted,
        attention,
        risky,
      },
    };
  }
}
