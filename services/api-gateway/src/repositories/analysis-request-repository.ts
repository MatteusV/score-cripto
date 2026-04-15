import type {
  AnalysisRequest,
  AnalysisTranslation,
} from "../generated/prisma/browser";
import type { AnalysisSummary } from "../use-cases/analysis-request/list-analyses-use-case";

export interface CreateAnalysisRequestData {
  address: string;
  chain: string;
  userId: string;
}

export interface CompleteAnalysisRequestData {
  confidence: number;
  modelVersion: string;
  positiveFactors: string[];
  promptVersion: string;
  reasoning: string;
  riskFactors: string[];
  score: number;
}

export interface UpsertTranslationData {
  analysisId: string;
  locale: string;
  positiveFactors: string[] | null;
  reasoning: string | null;
  riskFactors: string[] | null;
}

export interface AnalysisRequestRepository {
  create: (data: CreateAnalysisRequestData) => Promise<AnalysisRequest>;
  createWithPublicId: (
    data: CreateAnalysisRequestData
  ) => Promise<AnalysisRequest>;
  findActive: (
    userId: string,
    chain: string,
    address: string
  ) => Promise<AnalysisRequest | null>;
  findById: (id: string) => Promise<AnalysisRequest | null>;
  findByUserChainAddress: (
    userId: string,
    chain: string,
    address: string
  ) => Promise<AnalysisRequest | null>;
  findByUserIdAndPublicId: (
    userId: string,
    publicId: number
  ) => Promise<AnalysisRequest | null>;
  findTranslation: (
    analysisId: string,
    locale: string
  ) => Promise<AnalysisTranslation | null>;
  listByUserId: (
    userId: string,
    page: number,
    limit: number
  ) => Promise<{ items: AnalysisRequest[]; total: number }>;
  markCompleted: (
    id: string,
    result: CompleteAnalysisRequestData
  ) => Promise<AnalysisRequest>;
  markFailed: (id: string, reason: string) => Promise<AnalysisRequest>;
  markStaleAsFailed: (olderThan: Date, reason: string) => Promise<number>;
  summarizeByUserId: (userId: string) => Promise<{ summary: AnalysisSummary }>;
  upsertTranslation: (
    data: UpsertTranslationData
  ) => Promise<AnalysisTranslation>;
}
