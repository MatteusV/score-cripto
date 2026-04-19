import type { AnalysisRequestDTO } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error.js";

interface GetAnalysisByPublicIdUseCaseRequest {
  publicId: number;
  userId: string;
}

interface GetAnalysisByPublicIdUseCaseResponse {
  analysisRequest: AnalysisRequestDTO;
}

export class GetAnalysisByPublicIdUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute(
    data: GetAnalysisByPublicIdUseCaseRequest
  ): Promise<GetAnalysisByPublicIdUseCaseResponse> {
    const analysisRequest = await this.repository.findByUserIdAndPublicId(
      data.userId,
      data.publicId
    );

    if (!analysisRequest) {
      throw new AnalysisRequestNotFoundError();
    }

    return { analysisRequest };
  }
}
