import type { AnalysisStatus } from "../../generated/prisma/enums";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";

interface UpdateStatusToProcessingUseCaseRequest {
  analysisRequestId: string;
}

interface UpdateStatusToProcessingUseCaseResponse {
  analysisRequest: {
    status: AnalysisStatus;
    processingAt: Date | null;
  };
}

export class UpdateStatusToProcessingUseCase {
  private readonly analysisRequestRepository: AnalysisRequestRepository;

  constructor(analysisRequestRepository: AnalysisRequestRepository) {
    this.analysisRequestRepository = analysisRequestRepository;
  }

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
