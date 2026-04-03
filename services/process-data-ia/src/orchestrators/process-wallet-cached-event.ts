import { config } from "../config.js";
import { publishScoreCalculated } from "../events/publisher.js";
import type { PrismaClient, ProcessedData } from "../generated/prisma/client";
import { AnalysisRequestPrismaRepository } from "../repositories/prisma/analysis-request-prisma-repository.js";
import { ProcessedDataPrismaRepository } from "../repositories/prisma/processed-data-prisma-repository.js";
import type { WalletContextInput } from "../schemas/score.js";
import { prisma } from "../services/database.js";
import {
  type ScoringResult,
  scoreWithAI,
  scoreWithHeuristic,
} from "../services/scoring.js";
import { UpdateStatusToCompletedUseCase } from "../use-cases/analysis-request/update-status-to-completed-use-case.js";
import { UpdateStatusToFailedUseCase } from "../use-cases/analysis-request/update-status-to-failed-use-case.js";
import { UpdateStatusToProcessingUseCase } from "../use-cases/analysis-request/update-status-to-processing-use-case.js";
import { GetCachedScoreUseCase } from "../use-cases/processed-data/get-cached-score-use-case.js";
import { PersistScoreUseCase } from "../use-cases/processed-data/persist-score-use-case.js";
import { hashWalletContext } from "./calculate-score.js";

type ScoringFn = (input: WalletContextInput) => Promise<ScoringResult>;
type PublishFn = typeof publishScoreCalculated;

interface ProcessWalletCachedEventInput {
  requestId: string;
  userId: string;
  walletContext: WalletContextInput;
}

interface ProcessWalletCachedEventOutput {
  cachedResult: boolean;
  processedData: ProcessedData;
}

export class ProcessWalletCachedEvent {
  private readonly getCachedScore: GetCachedScoreUseCase;
  private readonly updateToProcessing: UpdateStatusToProcessingUseCase;
  private readonly updateToCompleted: UpdateStatusToCompletedUseCase;
  private readonly updateToFailed: UpdateStatusToFailedUseCase;
  private readonly persistScore: PersistScoreUseCase;
  private readonly scoringFn: ScoringFn;
  private readonly publishFn: PublishFn;
  private readonly prismaClient: PrismaClient;

  constructor(
    getCachedScore: GetCachedScoreUseCase,
    updateToProcessing: UpdateStatusToProcessingUseCase,
    updateToCompleted: UpdateStatusToCompletedUseCase,
    updateToFailed: UpdateStatusToFailedUseCase,
    persistScore: PersistScoreUseCase,
    scoringFn: ScoringFn,
    publishFn: PublishFn,
    prismaClient: PrismaClient
  ) {
    this.getCachedScore = getCachedScore;
    this.updateToProcessing = updateToProcessing;
    this.updateToCompleted = updateToCompleted;
    this.updateToFailed = updateToFailed;
    this.persistScore = persistScore;
    this.scoringFn = scoringFn;
    this.publishFn = publishFn;
    this.prismaClient = prismaClient;
  }

  async execute(
    input: ProcessWalletCachedEventInput
  ): Promise<ProcessWalletCachedEventOutput> {
    const { requestId, userId, walletContext } = input;
    const walletContextHash = hashWalletContext(walletContext);

    // 1. Check cache — retorna imediatamente se score válido existe
    const cachedScore = await this.getCachedScore.execute({
      chain: walletContext.chain,
      address: walletContext.address,
      walletContextHash,
    });

    if (cachedScore) {
      await this.updateToCompleted.execute({ analysisRequestId: requestId });
      return { processedData: cachedScore, cachedResult: true };
    }

    // 2. Marca como PROCESSING
    await this.updateToProcessing.execute({ analysisRequestId: requestId });

    // 3. Score com AI, fallback heurístico
    let scoringResult: Awaited<ReturnType<typeof scoreWithAI>>;

    try {
      scoringResult = await this.scoringFn(walletContext);
    } catch (error) {
      console.error(
        "[ProcessWalletCachedEvent] AI scoring failed, using heuristic:",
        (error as Error).message
      );

      await this.updateToFailed.execute({
        analysisRequestId: requestId,
        failureReason: (error as Error).message,
      });

      // Reabrir como PROCESSING para persistir resultado heurístico
      await this.updateToProcessing.execute({ analysisRequestId: requestId });

      const heuristic = scoreWithHeuristic(walletContext);
      scoringResult = {
        output: heuristic,
        modelVersion: "heuristic-v1",
        promptVersion: "heuristic",
        tokensUsed: 0,
        cost: 0,
        durationMs: 0,
      };
    }

    // 4. Persiste score
    const { processedData } = await this.persistScore.execute({
      analysisRequestId: requestId,
      userId,
      chain: walletContext.chain,
      address: walletContext.address,
      walletContextHash,
      score: scoringResult.output.score,
      confidence: scoringResult.output.confidence,
      reasoning: scoringResult.output.reasoning,
      positiveFactors: scoringResult.output.positiveFactors,
      riskFactors: scoringResult.output.riskFactors,
      modelVersion: scoringResult.modelVersion,
      promptVersion: scoringResult.promptVersion,
      tokensUsed: scoringResult.tokensUsed,
      cost: scoringResult.cost,
      inferenceDurationMs: scoringResult.durationMs,
    });

    // 5. Marca como COMPLETED
    await this.updateToCompleted.execute({ analysisRequestId: requestId });

    // 6. Publica evento (fire-and-forget)
    this.publishFn({
      processId: requestId,
      chain: walletContext.chain,
      address: walletContext.address,
      score: scoringResult.output.score,
      confidence: scoringResult.output.confidence,
      reasoning: scoringResult.output.reasoning,
      positiveFactors: scoringResult.output.positiveFactors,
      riskFactors: scoringResult.output.riskFactors,
      modelVersion: scoringResult.modelVersion,
      promptVersion: scoringResult.promptVersion,
    });

    return { processedData, cachedResult: false };
  }
}

export function createProcessWalletCachedEvent(): ProcessWalletCachedEvent {
  return createProcessWalletCachedEventWithDeps(
    scoreWithAI,
    publishScoreCalculated,
    prisma
  );
}

function createProcessWalletCachedEventWithDeps(
  scoringFn: ScoringFn,
  publishFn: PublishFn,
  prismaClient: PrismaClient
): ProcessWalletCachedEvent {
  const processedDataRepo = new ProcessedDataPrismaRepository(prismaClient);
  const analysisRepo = new AnalysisRequestPrismaRepository(prismaClient);

  return new ProcessWalletCachedEvent(
    new GetCachedScoreUseCase(processedDataRepo),
    new UpdateStatusToProcessingUseCase(analysisRepo),
    new UpdateStatusToCompletedUseCase(analysisRepo),
    new UpdateStatusToFailedUseCase(analysisRepo),
    new PersistScoreUseCase(processedDataRepo, config.scoreValidityHours),
    scoringFn,
    publishFn,
    prismaClient
  );
}
