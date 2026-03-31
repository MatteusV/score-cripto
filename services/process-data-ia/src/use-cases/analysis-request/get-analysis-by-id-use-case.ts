import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";

type GetAnalysisByIdUseCaseRequest = {
  analysisRequestId: string;
};

type GetAnalysisByIdUseCaseResponse = {
  analysisRequest: AnalysisRequest;
};

export class GetAnalysisByIdUseCase {
  constructor(private analisysRequestRepository: AnalysisRequestRepository) {}

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
