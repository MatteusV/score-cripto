import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisStatus } from "../../generated/prisma/enums";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestAlreadyExistsError } from "../errors/analysis-request-already-exists-error";

type CreateAnalysisUseCaseRequest = {
  userId: string;
  chain: string;
  address: string;
  walletContextHash: string;
};

type CreateAnalysisUseCaseResponse = {
  analysisRequest: AnalysisRequest;
};

export class CreateAnalysisRequestUseCase {
  constructor(private analysisRequestRepository: AnalysisRequestRepository) {}

  async execute({
    userId,
    chain,
    address,
    walletContextHash,
  }: CreateAnalysisUseCaseRequest): Promise<CreateAnalysisUseCaseResponse> {
    const existingRequest = await this.analysisRequestRepository.findByIndex({
      chain,
      address,
      userId,
    });

    if (
      existingRequest?.status === "PENDING" ||
      existingRequest?.status === "PROCESSING"
    ) {
      throw new AnalysisRequestAlreadyExistsError();
    }

    const status: AnalysisStatus = "PENDING";
    const result = await this.analysisRequestRepository.create({
      userId,
      chain,
      address,
      walletContextHash,
      status,
      requestedAt: new Date(),
      completedAt: null,
      failedAt: null,
      failureReason: null,
      processingAt: null,
    });

    if (!result) {
      throw new Error("Failed to create analysis request");
    }

    return { analysisRequest: result };
  }
}
