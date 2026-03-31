import type { AnalysisRequest } from "../generated/prisma/client";

type FindByIndexData = {
  chain: string;
  address: string;
  userId: string;
};

export type AnalysisRequestRepository = {
  create: (
    chain: Omit<AnalysisRequest, "id">
  ) => Promise<AnalysisRequest | null>;
  findByIndex: (data: FindByIndexData) => Promise<AnalysisRequest | null>;
  findById: (id: string) => Promise<AnalysisRequest | null>;
  update: (
    id: string,
    data: Partial<AnalysisRequest>
  ) => Promise<AnalysisRequest | null>;
};
