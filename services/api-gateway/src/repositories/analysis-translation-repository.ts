import type { AnalysisTranslationDTO } from "../domain/analysis-request.js";

export interface UpsertTranslationData {
  analysisId: string;
  locale: string;
  positiveFactors: string[] | null;
  reasoning: string | null;
  riskFactors: string[] | null;
}

export interface AnalysisTranslationRepository {
  findTranslation: (
    analysisId: string,
    locale: string
  ) => Promise<AnalysisTranslationDTO | null>;
  upsertTranslation: (
    data: UpsertTranslationData
  ) => Promise<AnalysisTranslationDTO>;
}
