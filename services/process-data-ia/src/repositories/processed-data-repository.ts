import type { ProcessedData } from "../generated/prisma/client";

interface FindCachedScoreData {
  address: string;
  chain: string;
  walletContextHash: string;
}

export interface ProcessedDataRepository {
  create: (
    data: Omit<ProcessedData, "id" | "createdAt">
  ) => Promise<ProcessedData>;
  findByAnalysisRequestId: (
    analysisRequestId: string
  ) => Promise<ProcessedData | null>;
  findCachedScore: (data: FindCachedScoreData) => Promise<ProcessedData | null>;
}
