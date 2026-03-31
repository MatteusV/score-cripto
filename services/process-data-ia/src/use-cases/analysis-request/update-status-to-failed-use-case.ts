import type { AnalysisStatus } from "../../generated/prisma/enums";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestIsNotProcessingError } from "../errors/analysis-request-is-not-processing-error";
import { AnalysisRequestNotFoundError } from "../errors/analysis-request-not-found-error";

interface UpdateStatusToFailedUseCaseRequest {
  analysisRequestId: string;
  failureReason: string;
}

interface UpdateStatusToFailedUseCaseResponse {
  analysisRequest: {
    status: AnalysisStatus;
    failedAt: Date | null;
    failureReason: string;
  };
}

export class UpdateStatusToFailedUseCase {
  constructor(
    private readonly analisysRequestRepository: AnalysisRequestRepository
  ) {}

  async execute({
    analysisRequestId,
    failureReason,
  }: UpdateStatusToFailedUseCaseRequest): Promise<UpdateStatusToFailedUseCaseResponse> {
    const analysisRequestExists =
      await this.analisysRequestRepository.findById(analysisRequestId);

    if (!analysisRequestExists) {
      throw new AnalysisRequestNotFoundError();
    }

    if (analysisRequestExists.status !== "PROCESSING") {
      throw new AnalysisRequestIsNotProcessingError();
    }

    const analysisRequestUpdated = await this.analisysRequestRepository.update(
      analysisRequestId,
      {
        status: "FAILED",
        failedAt: new Date(),
        failureReason,
      }
    );

    if (!analysisRequestUpdated) {
      throw new Error("Failed to update analysis request");
    }

    return {
      analysisRequest: {
        status: "FAILED",
        failedAt: analysisRequestUpdated.failedAt,
        failureReason,
      },
    };
  }
}
