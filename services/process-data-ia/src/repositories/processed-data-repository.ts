import type { ProcessedData } from "../generated/prisma/browser.js";
import type { ProcessedDataUncheckedCreateInput } from "../generated/prisma/models.js";

export interface FindCachedScoreData {
  address: string;
  chain: string;
  walletContextHash: string;
}

export interface ProcessedDataRepository {
  create: (data: ProcessedDataUncheckedCreateInput) => Promise<ProcessedData>;
  findByAnalysisRequestId: (
    analysisRequestId: string
  ) => Promise<ProcessedData | null>;
  findCachedScore: (data: FindCachedScoreData) => Promise<ProcessedData | null>;
}
