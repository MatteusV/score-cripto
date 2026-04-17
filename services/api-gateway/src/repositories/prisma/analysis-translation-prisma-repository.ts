import type { AnalysisTranslationDTO } from "../../domain/analysis-request";
import type { PrismaClient } from "../../generated/prisma/client";
import type {
  AnalysisTranslationRepository,
  UpsertTranslationData,
} from "../analysis-translation-repository";

function toDTO(record: unknown): AnalysisTranslationDTO {
  return record as AnalysisTranslationDTO;
}

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
    const result = await this.prisma.analysisTranslation.findUnique({
      where: { analysisId_locale: { analysisId, locale } },
    });
    return result ? toDTO(result) : null;
  }

  async upsertTranslation(
    data: UpsertTranslationData
  ): Promise<AnalysisTranslationDTO> {
    const record = await this.prisma.analysisTranslation.upsert({
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
    return toDTO(record);
  }
}
