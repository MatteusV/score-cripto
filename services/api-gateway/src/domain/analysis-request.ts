export type AnalysisStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface AnalysisRequestDTO {
  address: string;
  chain: string;
  completedAt: Date | null;
  confidence: number | null;
  failedAt: Date | null;
  failureReason: string | null;
  id: string;
  modelVersion: string | null;
  positiveFactors: string[] | null;
  promptVersion: string | null;
  publicId: number | null;
  reasoning: string | null;
  requestedAt: Date;
  riskFactors: string[] | null;
  score: number | null;
  status: string;
  userId: string;
}

export interface AnalysisTranslationDTO {
  analysisId: string;
  id: string;
  locale: string;
  positiveFactors: string[] | null;
  reasoning: string | null;
  riskFactors: string[] | null;
  translatedAt: Date;
}

export interface AnalysisSummary {
  attention: number;
  avgScore: number;
  risky: number;
  total: number;
  trusted: number;
}

export interface AnalysisListItem {
  address: string;
  chain: string;
  completedAt: Date;
  id: string;
  requestedAt: Date;
  score: number;
}
