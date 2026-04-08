import type { AnalysisRequest } from "../../generated/prisma/client";
import type {
  AnalysisRequestRepository,
  CompleteAnalysisRequestData,
} from "../../repositories/analysis-request-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";

interface CompleteAnalysisRequestUseCaseRequest {
  id: string;
  result: CompleteAnalysisRequestData;
}

interface CompleteAnalysisRequestUseCaseResponse {
  analysisRequest: AnalysisRequest;
}

export class CompleteAnalysisRequestUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute({
    id,
    result,
  }: CompleteAnalysisRequestUseCaseRequest): Promise<CompleteAnalysisRequestUseCaseResponse> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new AnalysisRequestNotFoundError();
    }

    const analysisRequest = await this.repository.markCompleted(id, result);

    return { analysisRequest };
  }
}
