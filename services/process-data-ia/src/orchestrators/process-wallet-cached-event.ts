import { config } from "../config.js";
import { publishScoreCalculated, publishScoreFailed } from "../events/publisher.js";
import type { ProcessedData } from "../generated/prisma/client";
import { ProcessedDataPrismaRepository } from "../repositories/prisma/processed-data-prisma-repository.js";
import type { WalletContextInput } from "../schemas/score.js";
import { prisma } from "../services/database.js";
import {
  type ScoringResult,
  scoreWithAI,
  scoreWithHeuristic,
} from "../services/scoring.js";
import { GetCachedScoreUseCase } from "../use-cases/processed-data/get-cached-score-use-case.js";
import { PersistScoreUseCase } from "../use-cases/processed-data/persist-score-use-case.js";
import { hashWalletContext } from "./hash-wallet-context.js";

type ScoringFn = (input: WalletContextInput) => Promise<ScoringResult>;
type PublishCalculatedFn = typeof publishScoreCalculated;
type PublishFailedFn = typeof publishScoreFailed;

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
      // Publica o resultado do cache para o gateway atualizar o status
      this.publishCalculated({
        processId: requestId,
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

    // 2. Score com AI, fallback heurístico
    let scoringResult: ScoringResult;

    try {
      scoringResult = await this.scoringFn(walletContext);
    } catch (error) {
      const reason = (error as Error).message;
      console.error(
        "[ProcessWalletCachedEvent] AI scoring failed, using heuristic:",
        reason
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

    // 3. Persiste score
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
      console.error("[ProcessWalletCachedEvent] Failed to persist score:", reason);
      this.publishFailed({ processId: requestId, reason });
      throw error;
    }

    // 4. Publica evento com resultado completo (fire-and-forget)
    this.publishCalculated({
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
  const processedDataRepo = new ProcessedDataPrismaRepository(prisma);

  return new ProcessWalletCachedEvent(
    new GetCachedScoreUseCase(processedDataRepo),
    new PersistScoreUseCase(processedDataRepo, config.scoreValidityHours),
    scoreWithAI,
    publishScoreCalculated,
    publishScoreFailed
  );
}
