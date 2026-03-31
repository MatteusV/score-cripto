import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface CountUserAnalysisThisMonthUseCaseRequest {
  userId: string;
}

export class CountUserAnalysisThisMonthUseCase {
  constructor(
    private readonly analysisRequestRepository: AnalysisRequestRepository
  ) {}

  async execute({
    userId,
  }: CountUserAnalysisThisMonthUseCaseRequest): Promise<number> {
    return this.analysisRequestRepository.countByUserThisMonth(userId);
  }
}
