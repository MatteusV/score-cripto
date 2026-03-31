import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface CountUserAnalysisThisMonthUseCaseRequest {
  userId: string;
}

export class CountUserAnalysisThisMonthUseCase {
  private readonly analysisRequestRepository: AnalysisRequestRepository;

  constructor(analysisRequestRepository: AnalysisRequestRepository) {
    this.analysisRequestRepository = analysisRequestRepository;
  }

  async execute({
    userId,
  }: CountUserAnalysisThisMonthUseCaseRequest): Promise<number> {
    return await this.analysisRequestRepository.countByUserThisMonth(userId);
  }
}
