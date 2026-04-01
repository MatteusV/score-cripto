import type { AnalysisStatus } from "../../generated/prisma/enums";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestIsNotProcessingError } from "../errors/analysis-request-is-not-processing-error";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";

interface UpdateStatusToCompletedUseCaseRequest {
  analysisRequestId: string;
}

interface UpdateStatusToCompletedUseCaseResponse {
  analysisRequest: {
    status: AnalysisStatus;
    completedAt: Date | null;
  };
}

export class UpdateStatusToCompletedUseCase {
  private readonly analysisRequestRepository: AnalysisRequestRepository;

  constructor(analysisRequestRepository: AnalysisRequestRepository) {
    this.analysisRequestRepository = analysisRequestRepository;
  }

  async execute({
    analysisRequestId,
  }: UpdateStatusToCompletedUseCaseRequest): Promise<UpdateStatusToCompletedUseCaseResponse> {
    const analysisRequest =
      await this.analysisRequestRepository.findById(analysisRequestId);

    if (!analysisRequest) {
      throw new AnalysisRequestNotFoundError();
    }

    if (analysisRequest.status !== "PROCESSING") {
      throw new AnalysisRequestIsNotProcessingError();
    }

    const updatedAnalysisRequest = await this.analysisRequestRepository.update(
      analysisRequestId,
      {
        status: "COMPLETED",
        completedAt: new Date(),
      }
    );

    if (!updatedAnalysisRequest) {
      throw new AnalysisRequestNotFoundError();
    }

    return {
      analysisRequest: {
        status: updatedAnalysisRequest.status,
        completedAt: updatedAnalysisRequest.completedAt,
      },
    };
  }
}
