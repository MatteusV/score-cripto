import type { ProcessedData } from "../../generated/prisma/client.js";
import type { ProcessedDataRepository } from "../../repositories/processed-data-repository.js";

interface PersistScoreUseCaseRequest {
  address: string;
  analysisRequestId: string;
  chain: string;
  confidence: number;
  cost: number;
  inferenceDurationMs: number;
  modelVersion: string;
  positiveFactors: string[];
  promptVersion: string;
  reasoning: string;
  riskFactors: string[];
  score: number;
  tokensUsed: number;
  userId: string;
  walletContextHash: string;
}

interface PersistScoreUseCaseResponse {
  processedData: ProcessedData;
}

export class PersistScoreUseCase {
  private readonly processedDataRepository: ProcessedDataRepository;

  private readonly scoreValidityHours: number;

  constructor(
    processedDataRepository: ProcessedDataRepository,
    scoreValidityHours: number
  ) {
    this.processedDataRepository = processedDataRepository;
    this.scoreValidityHours = scoreValidityHours;
  }

  async execute(
    data: PersistScoreUseCaseRequest
  ): Promise<PersistScoreUseCaseResponse> {
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + this.scoreValidityHours);

    const processedData = await this.processedDataRepository.create({
      analysisRequestId: data.analysisRequestId,
      userId: data.userId,
      chain: data.chain,
      address: data.address,
      score: data.score,
      confidence: data.confidence,
      reasoning: data.reasoning,
      positiveFactors: data.positiveFactors,
      riskFactors: data.riskFactors,
      modelVersion: data.modelVersion,
      promptVersion: data.promptVersion,
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      inferenceDurationMs: data.inferenceDurationMs,
      walletContextHash: data.walletContextHash,
      validUntil,
    });

    return { processedData };
  }
}
