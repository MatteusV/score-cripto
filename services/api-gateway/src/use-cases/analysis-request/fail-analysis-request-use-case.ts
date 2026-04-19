import type { AnalysisRequestDTO } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error.js";

interface FailAnalysisRequestUseCaseRequest {
  id: string;
  reason: string;
}

interface FailAnalysisRequestUseCaseResponse {
  analysisRequest: AnalysisRequestDTO;
}

export class FailAnalysisRequestUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute({
    id,
    reason,
  }: FailAnalysisRequestUseCaseRequest): Promise<FailAnalysisRequestUseCaseResponse> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new AnalysisRequestNotFoundError();
    }

    const analysisRequest = await this.repository.markFailed(id, reason);

    return { analysisRequest };
  }
}
