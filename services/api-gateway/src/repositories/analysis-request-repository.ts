import type { AnalysisRequest } from "../generated/prisma/browser";

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
