import type { AnalysisRequest } from "../generated/prisma/client";

export interface FindByIndexData {
  address: string;
  chain: string;
  userId: string;
}

export interface ListByUserResult {
  items: AnalysisRequest[];
  total: number;
}

export interface AnalysisRequestRepository {
  countByUserThisMonth: (userId: string) => Promise<number>;
  create: (
    data: Omit<AnalysisRequest, "id">
  ) => Promise<AnalysisRequest | null>;
  findById: (id: string) => Promise<AnalysisRequest | null>;
  findByIndex: (data: FindByIndexData) => Promise<AnalysisRequest | null>;
  listByUserId: (
    userId: string,
    page: number,
    limit: number
  ) => Promise<ListByUserResult>;
  update: (
    id: string,
    data: Partial<AnalysisRequest>
  ) => Promise<AnalysisRequest | null>;
}
