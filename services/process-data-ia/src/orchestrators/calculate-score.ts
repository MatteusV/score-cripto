import { createHash } from "node:crypto";
import { config } from "../config";
import { publishScoreCalculated } from "../events/publisher";
import type { ProcessedData } from "../generated/prisma/client";
import { AnalysisRequestPrismaRepository } from "../repositories/prisma/analysis-request-prisma-repository";
import { ProcessedDataPrismaRepository } from "../repositories/prisma/processed-data-prisma-repository";
import type { WalletContextInput } from "../schemas/score";
import { scoreWithAI, scoreWithHeuristic } from "../services/scoring";
import { CreateAnalysisRequestUseCase } from "../use-cases/analysis-request/create-analysis-request-use-case";
import { GetAnalysisByChainAddressUserUseCase } from "../use-cases/analysis-request/get-analysis-by-chain-address-user-use-case";
import { UpdateStatusToCompletedUseCase } from "../use-cases/analysis-request/update-status-to-completed-use-case";
import { UpdateStatusToFailedUseCase } from "../use-cases/analysis-request/update-status-to-failed-use-case";
import { UpdateStatusToProcessingUseCase } from "../use-cases/analysis-request/update-status-to-processing-use-case";
import { GetCachedScoreUseCase } from "../use-cases/processed-data/get-cached-score-use-case";
import { PersistScoreUseCase } from "../use-cases/processed-data/persist-score-use-case";

export interface CalculateScoreInput {
  userId: string;
  walletContext: WalletContextInput;
}

export interface CalculateScoreOutput {
  cachedResult: boolean;
  processedData: ProcessedData;
}

export function hashWalletContext(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export class CalculateScore {
  private readonly getCachedScore: GetCachedScoreUseCase;
  private readonly createAnalysis: CreateAnalysisRequestUseCase;
  private readonly updateToProcessing: UpdateStatusToProcessingUseCase;
  private readonly updateToCompleted: UpdateStatusToCompletedUseCase;
  private readonly updateToFailed: UpdateStatusToFailedUseCase;
  private readonly persistScore: PersistScoreUseCase;

  constructor(
    getCachedScore: GetCachedScoreUseCase,
    createAnalysis: CreateAnalysisRequestUseCase,
    updateToProcessing: UpdateStatusToProcessingUseCase,
    updateToCompleted: UpdateStatusToCompletedUseCase,
    updateToFailed: UpdateStatusToFailedUseCase,
    persistScore: PersistScoreUseCase
  ) {
    this.getCachedScore = getCachedScore;
    this.createAnalysis = createAnalysis;
    this.updateToProcessing = updateToProcessing;
    this.updateToCompleted = updateToCompleted;
    this.updateToFailed = updateToFailed;
    this.persistScore = persistScore;
  }

  async execute(input: CalculateScoreInput): Promise<CalculateScoreOutput> {
    const { walletContext, userId } = input;
    const walletContextHash = hashWalletContext(walletContext);

    // 1. Check cache
    const cachedScore = await this.getCachedScore.execute({
      chain: walletContext.chain,
      address: walletContext.address,
      walletContextHash,
    });

    if (cachedScore) {
      return { processedData: cachedScore, cachedResult: true };
    }

    // 2. Create analysis request (handles duplicate PENDING/PROCESSING)
    const { analysisRequest } = await this.createAnalysis.execute({
      chain: walletContext.chain,
      address: walletContext.address,
      userId,
      walletContextHash,
    });

    // 3. Mark as PROCESSING
    await this.updateToProcessing.execute({
      analysisRequestId: analysisRequest.id,
    });

    // 4. Score with AI, fallback to heuristic on failure
    let scoringResult: Awaited<ReturnType<typeof scoreWithAI>>;

    try {
      scoringResult = await scoreWithAI(walletContext);
    } catch (error) {
      console.error(
        "[CalculateScore] AI scoring failed, using heuristic fallback:",
        (error as Error).message
      );

      await this.updateToFailed.execute({
        analysisRequestId: analysisRequest.id,
        failureReason: (error as Error).message,
      });

      const heuristic = scoreWithHeuristic(walletContext);
      scoringResult = {
        output: heuristic,
        modelVersion: "heuristic-v1",
        promptVersion: "heuristic",
        tokensUsed: 0,
        cost: 0,
        durationMs: 0,
      };

      // Re-create and process with heuristic result
      await this.updateToProcessing.execute({
        analysisRequestId: analysisRequest.id,
      });
    }

    // 5. Persist score
    const { processedData } = await this.persistScore.execute({
      analysisRequestId: analysisRequest.id,
      userId,
      chain: walletContext.chain,
      address: walletContext.address,
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

    // 6. Mark as COMPLETED
    await this.updateToCompleted.execute({
      analysisRequestId: analysisRequest.id,
    });

    // 7. Publish event (fire-and-forget)
    publishScoreCalculated({
      processId: analysisRequest.id,
      chain: walletContext.chain,
      address: walletContext.address,
      score: scoringResult.output.score,
      confidence: scoringResult.output.confidence,
      modelVersion: scoringResult.modelVersion,
      promptVersion: scoringResult.promptVersion,
    });

    return { processedData, cachedResult: false };
  }
}

export function createCalculateScore(): CalculateScore {
  const analysisRepo = new AnalysisRequestPrismaRepository();
  const processedDataRepo = new ProcessedDataPrismaRepository();
  const getByChainAddressUser = new GetAnalysisByChainAddressUserUseCase(
    analysisRepo
  );

  return new CalculateScore(
    new GetCachedScoreUseCase(processedDataRepo),
    new CreateAnalysisRequestUseCase(analysisRepo, getByChainAddressUser),
    new UpdateStatusToProcessingUseCase(analysisRepo),
    new UpdateStatusToCompletedUseCase(analysisRepo),
    new UpdateStatusToFailedUseCase(analysisRepo),
    new PersistScoreUseCase(processedDataRepo, config.scoreValidityHours)
  );
}
