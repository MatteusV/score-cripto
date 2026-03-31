import type { AnalysisStatus } from "../../generated/prisma/enums";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";

type UpdateStatusToProcessingUseCaseRequest = {
  analysisRequestId: string;
};

type UpdateStatusToProcessingUseCaseResponse = {
  analysisRequest: {
    status: AnalysisStatus;
    processingAt: Date | null;
  };
};

export class UpdateStatusToProcessingUseCase {
  constructor(private analysisRequestRepository: AnalysisRequestRepository) {}

  async execute({
    analysisRequestId,
  }: UpdateStatusToProcessingUseCaseRequest): Promise<UpdateStatusToProcessingUseCaseResponse> {
    const analysisRequest =
      await this.analysisRequestRepository.findById(analysisRequestId);

    if (!analysisRequest) {
      throw new AnalysisRequestNotFoundError();
    }

    const updatedAnalysisRequest = await this.analysisRequestRepository.update(
      analysisRequestId,
      {
        status: "PROCESSING",
        processingAt: new Date(),
      }
    );

    if (!updatedAnalysisRequest) {
      throw new AnalysisRequestNotFoundError();
    }

    return {
      analysisRequest: {
        status: updatedAnalysisRequest.status,
        processingAt: updatedAnalysisRequest.processingAt,
      },
    };
  }
}
