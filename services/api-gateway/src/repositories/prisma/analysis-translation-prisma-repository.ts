import type { AnalysisTranslationDTO } from "../../domain/analysis-request";
import type { PrismaClient } from "../../generated/prisma/client";
import type {
  AnalysisTranslationRepository,
  UpsertTranslationData,
} from "../analysis-translation-repository";

export class AnalysisTranslationPrismaRepository
  implements AnalysisTranslationRepository
{
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async findTranslation(
    analysisId: string,
    locale: string
  ): Promise<AnalysisTranslationDTO | null> {
    return this.prisma.analysisTranslation.findUnique({
      where: { analysisId_locale: { analysisId, locale } },
    });
  }

  async upsertTranslation(
    data: UpsertTranslationData
  ): Promise<AnalysisTranslationDTO> {
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
}
