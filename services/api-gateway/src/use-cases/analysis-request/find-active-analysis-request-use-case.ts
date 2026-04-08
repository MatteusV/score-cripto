import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface FindActiveAnalysisRequestUseCaseRequest {
  userId: string;
  chain: string;
  address: string;
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
  }: FindActiveAnalysisRequestUseCaseRequest): Promise<AnalysisRequest | null> {
    return await this.repository.findActive(userId, chain, address);
  }
}
