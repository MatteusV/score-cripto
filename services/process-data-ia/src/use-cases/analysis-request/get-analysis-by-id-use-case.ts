import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";

interface GetAnalysisByIdUseCaseRequest {
  analysisRequestId: string;
}

interface GetAnalysisByIdUseCaseResponse {
  analysisRequest: AnalysisRequest;
}

export class GetAnalysisByIdUseCase {
  private readonly analisysRequestRepository: AnalysisRequestRepository;

  constructor(analisysRequestRepository: AnalysisRequestRepository) {
    this.analisysRequestRepository = analisysRequestRepository;
  }

  async execute({
    analysisRequestId,
  }: GetAnalysisByIdUseCaseRequest): Promise<GetAnalysisByIdUseCaseResponse> {
    const analysisRequest =
      await this.analisysRequestRepository.findById(analysisRequestId);

    if (!analysisRequest) {
      throw new AnalysisRequestNotFoundError();
    }

    return {
      analysisRequest,
    };
  }
}
