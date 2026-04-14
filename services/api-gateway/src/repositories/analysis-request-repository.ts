import type { AnalysisRequest } from "../generated/prisma/browser";
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
  summarizeByUserId: (userId: string) => Promise<{ summary: AnalysisSummary }>;
}
