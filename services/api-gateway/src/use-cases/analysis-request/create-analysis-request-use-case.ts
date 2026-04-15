import type { AnalysisRequestDTO } from "../../domain/analysis-request";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface CreateAnalysisRequestUseCaseRequest {
  address: string;
  chain: string;
  userId: string;
}

interface CreateAnalysisRequestUseCaseResponse {
  analysisRequest: AnalysisRequestDTO;
}

export class CreateAnalysisRequestUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute(
    data: CreateAnalysisRequestUseCaseRequest
  ): Promise<CreateAnalysisRequestUseCaseResponse> {
    const analysisRequest = await this.repository.createWithPublicId({
      userId: data.userId,
      chain: data.chain,
      address: data.address,
    });

    return { analysisRequest };
  }
}
