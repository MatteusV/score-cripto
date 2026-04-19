import { randomUUID } from "node:crypto";
import type { AnalysisTranslationDTO } from "../../domain/analysis-request.js";
import type {
  AnalysisTranslationRepository,
  UpsertTranslationData,
} from "../analysis-translation-repository.js";

export class AnalysisTranslationInMemoryRepository
  implements AnalysisTranslationRepository
{
  readonly items: Map<string, AnalysisTranslationDTO> = new Map();

  async findTranslation(
    analysisId: string,
    locale: string
  ): Promise<AnalysisTranslationDTO | null> {
    return this.items.get(`${analysisId}:${locale}`) ?? null;
  }

  async upsertTranslation(
    data: UpsertTranslationData
  ): Promise<AnalysisTranslationDTO> {
    const key = `${data.analysisId}:${data.locale}`;
    const existing = this.items.get(key);
    const translation: AnalysisTranslationDTO = {
      id: existing?.id ?? randomUUID(),
      analysisId: data.analysisId,
      locale: data.locale,
      reasoning: data.reasoning,
      positiveFactors: data.positiveFactors,
      riskFactors: data.riskFactors,
      translatedAt: new Date(),
    };
    this.items.set(key, translation);
    return translation;
  }
}
