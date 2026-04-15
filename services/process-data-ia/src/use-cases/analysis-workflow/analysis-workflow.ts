import { config } from "../../config.js";
import {
  publishScoreCalculated,
  publishScoreFailed,
} from "../../events/publisher.js";
import type { ProcessedData } from "../../generated/prisma/client";
import { logger } from "../../logger.js";
import { ProcessedDataPrismaRepository } from "../../repositories/prisma/processed-data-prisma-repository.js";
import type { WalletContextInput } from "../../schemas/score.js";
import { prisma } from "../../services/database.js";
import {
  type ScoringResult,
  scoreWithAI,
  scoreWithHeuristic,
} from "../../services/scoring.js";
import { GetCachedScoreUseCase } from "../processed-data/get-cached-score-use-case.js";
import { PersistScoreUseCase } from "../processed-data/persist-score-use-case.js";
import { hashWalletContext } from "./hash-wallet-context.js";

type ScoringFn = (input: WalletContextInput) => Promise<ScoringResult>;
type PublishCalculatedFn = typeof publishScoreCalculated;
type PublishFailedFn = typeof publishScoreFailed;

interface AnalysisWorkflowInput {
  requestId: string;
  userId: string;
  walletContext: WalletContextInput;
}

interface AnalysisWorkflowOutput {
  cachedResult: boolean;
  processedData: ProcessedData;
}

/**
 * AnalysisWorkflow — boundary único do ciclo de análise em process-data-ia.
 *
 * Responsabilidades:
 * 1. Verificar score em cache persistido (deduplicação por hash do contexto)
 * 2. Acionar IA ou fallback heurístico quando cache miss
 * 3. Persistir resultado com TTL (ProcessedData)
 * 4. Publicar wallet.score.calculated ou wallet.score.failed
 *
 * Os entrypoints (consumer de eventos) adaptam transporte para esta interface.
 */
export class AnalysisWorkflow {
  private readonly getCachedScore: GetCachedScoreUseCase;
  private readonly persistScore: PersistScoreUseCase;
  private readonly scoringFn: ScoringFn;
  private readonly publishCalculated: PublishCalculatedFn;
  private readonly publishFailed: PublishFailedFn;

  constructor(
    getCachedScore: GetCachedScoreUseCase,
    persistScore: PersistScoreUseCase,
    scoringFn: ScoringFn,
    publishCalculated: PublishCalculatedFn,
    publishFailed: PublishFailedFn
  ) {
    this.getCachedScore = getCachedScore;
    this.persistScore = persistScore;
    this.scoringFn = scoringFn;
    this.publishCalculated = publishCalculated;
    this.publishFailed = publishFailed;
  }

  async execute(input: AnalysisWorkflowInput): Promise<AnalysisWorkflowOutput> {
    const { requestId, userId, walletContext } = input;
    const walletContextHash = hashWalletContext(walletContext);

    // 1. Cache hit — republica resultado sem chamar IA novamente
    let cachedScore: Awaited<ReturnType<typeof this.getCachedScore.execute>>;
    try {
      cachedScore = await this.getCachedScore.execute({
        chain: walletContext.chain,
        address: walletContext.address,
        walletContextHash,
      });
    } catch (error) {
      const reason = (error as Error).message;
      logger.error(
        { err: reason },
        "[AnalysisWorkflow] Cache check failed — publishing failed event"
      );
      this.publishFailed({
        requestId,
        reason: `Cache lookup failed: ${reason}`,
      });
      throw error;
    }

    if (cachedScore) {
      this.publishCalculated({
        requestId,
        chain: walletContext.chain,
        address: walletContext.address,
        score: cachedScore.score,
        confidence: cachedScore.confidence,
        reasoning: cachedScore.reasoning,
        positiveFactors: cachedScore.positiveFactors as string[],
        riskFactors: cachedScore.riskFactors as string[],
        modelVersion: cachedScore.modelVersion,
        promptVersion: cachedScore.promptVersion,
      });
      return { processedData: cachedScore, cachedResult: true };
    }

    // 2. Cache miss — score com IA, fallback heurístico em caso de erro
    let scoringResult: ScoringResult;

    try {
      scoringResult = await this.scoringFn(walletContext);
    } catch (error) {
      const reason = (error as Error).message;
      logger.warn(
        { err: reason },
        "[AnalysisWorkflow] AI scoring failed, using heuristic"
      );

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

    // 3. Persiste score com TTL
    let processedData: ProcessedData;
    try {
      const result = await this.persistScore.execute({
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
      processedData = result.processedData;
    } catch (error) {
      const reason = (error as Error).message;
      logger.error(
        { err: reason },
        "[AnalysisWorkflow] Failed to persist score"
      );
      this.publishFailed({ requestId, reason });
      throw error;
    }

    // 4. Publica resultado
    const published = this.publishCalculated({
      requestId,
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

    if (!published) {
      logger.error(
        { requestId },
        "[AnalysisWorkflow] Failed to publish wallet.score.calculated — publishing failed event"
      );
      this.publishFailed({
        requestId,
        reason: "Event publish failure after successful scoring",
      });
    }

    return { processedData, cachedResult: false };
  }
}

export function makeAnalysisWorkflow(): AnalysisWorkflow {
  const processedDataRepo = new ProcessedDataPrismaRepository(prisma);

  return new AnalysisWorkflow(
    new GetCachedScoreUseCase(processedDataRepo),
    new PersistScoreUseCase(processedDataRepo, config.scoreValidityHours),
    scoreWithAI,
    publishScoreCalculated,
    publishScoreFailed
  );
}
