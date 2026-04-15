import type { AnalysisRequestDTO } from "../../domain/analysis-request";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface FindActiveAnalysisRequestUseCaseRequest {
  address: string;
  chain: string;
  userId: string;
}

export class FindActiveAnalysisRequestUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute({
    userId,
    chain,
    address,
  }: FindActiveAnalysisRequestUseCaseRequest): Promise<AnalysisRequestDTO | null> {
    return await this.repository.findActive(userId, chain, address);
  }
}
