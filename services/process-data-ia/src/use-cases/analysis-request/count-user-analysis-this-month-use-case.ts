import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface CountUserAnalysisThisMonthUseCaseRequest {
  userId: string;
}

export class CountUserAnalysisThisMonthUseCase {
  private readonly analysisRequestRepository: AnalysisRequestRepository;

  constructor(analysisRequestRepository: AnalysisRequestRepository) {
    this.analysisRequestRepository = analysisRequestRepository;
  }

  execute({
    userId,
  }: CountUserAnalysisThisMonthUseCaseRequest): Promise<number> {
    return this.analysisRequestRepository.countByUserThisMonth(userId);
  }
}
