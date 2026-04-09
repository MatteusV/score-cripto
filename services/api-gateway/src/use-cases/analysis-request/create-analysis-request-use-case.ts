import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface CreateAnalysisRequestUseCaseRequest {
  address: string;
  chain: string;
  userId: string;
}

interface CreateAnalysisRequestUseCaseResponse {
  analysisRequest: AnalysisRequest;
}

export class CreateAnalysisRequestUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute(
    data: CreateAnalysisRequestUseCaseRequest
  ): Promise<CreateAnalysisRequestUseCaseResponse> {
    const analysisRequest = await this.repository.create({
      userId: data.userId,
      chain: data.chain,
      address: data.address,
    });

    return { analysisRequest };
  }
}
