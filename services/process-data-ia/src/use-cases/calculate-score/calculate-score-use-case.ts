import type { ProcessedData } from "../../generated/prisma/client";
import type { WalletContextInput } from "../../schemas/score";
import type { CreateAnalysisRequestUseCase } from "../analysis-request/create-analysis-request-use-case";
import type { UpdateAnalysisRequestToCompletedUseCase } from "../analysis-request/update-status-to-completed-use-case";
import type { UpdateAnalysisRequestToProcessingUseCase } from "../analysis-request/update-status-to-processing-use-case";
import type { GetCachedScoreUseCase } from "../processed-data/get-cached-score-use-case";
import type { PersistScoreUseCase } from "../processed-data/persist-score-use-case";

interface CalculateScoreUseCaseRequest {
	walletContext: WalletContextInput;
	userId: string;
	walletContextHash: string;
}

interface CalculateScoreUseCaseResponse {
	processedData: ProcessedData;
	cachedResult: boolean;
}

export class CalculateScoreUseCase {
	constructor(
		private readonly getCachedScore: GetCachedScoreUseCase,
		private readonly createAnalysis: CreateAnalysisRequestUseCase,
		private readonly updateToProcessing: UpdateAnalysisRequestToProcessingUseCase,
		private readonly persistScore: PersistScoreUseCase,
		private readonly updateToCompleted: UpdateAnalysisRequestToCompletedUseCase,
		private readonly scoreWithAI: (input: WalletContextInput) => Promise<{
			output: {
				score: number;
				confidence: number;
				reasoning: string;
				positiveFactors: string[];
				riskFactors: string[];
			};
			modelVersion: string;
			promptVersion: string;
			tokensUsed: number;
			cost: number;
			durationMs: number;
		}>,
		private readonly publishEvent: (
			routingKey: string,
			payload: unknown,
		) => boolean,
	) {}

	async execute(
		request: CalculateScoreUseCaseRequest,
	): Promise<CalculateScoreUseCaseResponse> {
		const { walletContext, userId, walletContextHash } = request;

		// 1. Check cache
		const cachedScore = await this.getCachedScore.execute({
			chain: walletContext.chain,
			address: walletContext.address,
			walletContextHash,
		});

		if (cachedScore) {
			return {
				processedData: cachedScore,
				cachedResult: true,
			};
		}

		// 2. Create analysis request
		const { analysisRequest } = await this.createAnalysis.execute({
			chain: walletContext.chain,
			address: walletContext.address,
			userId,
			walletContextHash,
		});

		// 3. Update to PROCESSING
		await this.updateToProcessing.execute({
			analysisRequestId: analysisRequest.id,
		});

		// 4. Score with AI
		const scoringResult = await this.scoreWithAI(walletContext);

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

		// 6. Update to COMPLETED
		await this.updateToCompleted.execute({
			analysisRequestId: analysisRequest.id,
		});

		// 7. Publish event (fire-and-forget)
		this.publishEvent("wallet.score.calculated", {
			processId: analysisRequest.id,
			chain: walletContext.chain,
			address: walletContext.address,
			score: scoringResult.output.score,
			confidence: scoringResult.output.confidence,
			modelVersion: scoringResult.modelVersion,
			promptVersion: scoringResult.promptVersion,
		});

		return {
			processedData,
			cachedResult: false,
		};
	}
}
