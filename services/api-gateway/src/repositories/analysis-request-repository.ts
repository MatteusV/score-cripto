import type {
  AnalysisRequestDTO,
  AnalysisSummary,
} from "../domain/analysis-request";

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
  create: (data: CreateAnalysisRequestData) => Promise<AnalysisRequestDTO>;
  createWithPublicId: (
    data: CreateAnalysisRequestData
  ) => Promise<AnalysisRequestDTO>;
  findActive: (
    userId: string,
    chain: string,
    address: string
  ) => Promise<AnalysisRequestDTO | null>;
  findById: (id: string) => Promise<AnalysisRequestDTO | null>;
  findByUserChainAddress: (
    userId: string,
    chain: string,
    address: string
  ) => Promise<AnalysisRequestDTO | null>;
  findByUserIdAndPublicId: (
    userId: string,
    publicId: number
  ) => Promise<AnalysisRequestDTO | null>;
  listByUserId: (
    userId: string,
    page: number,
    limit: number
  ) => Promise<{ items: AnalysisRequestDTO[]; total: number }>;
  markCompleted: (
    id: string,
    result: CompleteAnalysisRequestData
  ) => Promise<AnalysisRequestDTO>;
  markFailed: (id: string, reason: string) => Promise<AnalysisRequestDTO>;
  markStaleAsFailed: (olderThan: Date, reason: string) => Promise<number>;
  summarizeByUserId: (userId: string) => Promise<{ summary: AnalysisSummary }>;
  listAll: (
    page: number,
    limit: number,
    filters?: { status?: string; userId?: string }
  ) => Promise<{ items: AnalysisRequestDTO[]; total: number }>;
}
