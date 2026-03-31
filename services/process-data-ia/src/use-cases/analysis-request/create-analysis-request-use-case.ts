import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisStatus } from "../../generated/prisma/enums";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";
import { AnalysisRequestAlreadyExistsError } from "../errors/analysis-request-already-exists-error";

interface CreateAnalysisUseCaseRequest {
  address: string;
  chain: string;
  userId: string;
  walletContextHash: string;
}

interface CreateAnalysisUseCaseResponse {
  analysisRequest: AnalysisRequest;
}

export class CreateAnalysisRequestUseCase {
  private readonly analysisRequestRepository: AnalysisRequestRepository;

  constructor(analysisRequestRepository: AnalysisRequestRepository) {
    this.analysisRequestRepository = analysisRequestRepository;
  }

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
