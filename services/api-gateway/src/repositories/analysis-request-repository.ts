import type { AnalysisRequest } from "../generated/prisma/browser";

export interface CreateAnalysisRequestData {
  userId: string;
  chain: string;
  address: string;
}

export interface CompleteAnalysisRequestData {
  score: number;
  confidence: number;
  reasoning: string;
  positiveFactors: string[];
  riskFactors: string[];
  modelVersion: string;
  promptVersion: string;
}

export interface AnalysisRequestRepository {
  create: (data: CreateAnalysisRequestData) => Promise<AnalysisRequest>;
  findActive: (
    userId: string,
    chain: string,
    address: string
  ) => Promise<AnalysisRequest | null>;
  findById: (id: string) => Promise<AnalysisRequest | null>;
  markCompleted: (
    id: string,
    result: CompleteAnalysisRequestData
  ) => Promise<AnalysisRequest>;
  markFailed: (id: string, reason: string) => Promise<AnalysisRequest>;
}
