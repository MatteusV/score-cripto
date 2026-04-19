import type { AnalysisRequestDTO } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error.js";

interface GetAnalysisRequestUseCaseRequest {
  id: string;
}

interface GetAnalysisRequestUseCaseResponse {
  analysisRequest: AnalysisRequestDTO;
}

export class GetAnalysisRequestUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute({
    id,
  }: GetAnalysisRequestUseCaseRequest): Promise<GetAnalysisRequestUseCaseResponse> {
    const analysisRequest = await this.repository.findById(id);

    if (!analysisRequest) {
      throw new AnalysisRequestNotFoundError();
    }

    return { analysisRequest };
  }
}
