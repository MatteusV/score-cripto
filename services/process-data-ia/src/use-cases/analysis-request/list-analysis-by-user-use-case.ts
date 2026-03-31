import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

const MAX_LIMIT = 100;

interface ListAnalysisByUserUseCaseRequest {
  limit?: number;
  page?: number;
  userId: string;
}

interface ListAnalysisByUserUseCaseResponse {
  items: AnalysisRequest[];
  total: number;
}

export class ListAnalysisByUserUseCase {
  constructor(
    private readonly analysisRequestRepository: AnalysisRequestRepository
  ) {}

  async execute({
    userId,
    page = 1,
    limit = 20,
  }: ListAnalysisByUserUseCaseRequest): Promise<ListAnalysisByUserUseCaseResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(limit, MAX_LIMIT);

    return this.analysisRequestRepository.listByUserId(
      userId,
      safePage,
      safeLimit
    );
  }
}
