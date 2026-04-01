import type { FastifyInstance } from "fastify";
import { createCalculateScore } from "../orchestrators/calculate-score.js";
import { WalletContextInputSchema } from "../schemas/score.js";
import { AnalysisRequestPrismaRepository } from "../repositories/prisma/analysis-request-prisma-repository.js";
import { ProcessedDataPrismaRepository } from "../repositories/prisma/processed-data-prisma-repository.js";
import { GetScoreByProcessIdUseCase } from "../use-cases/processed-data/get-score-by-process-id-use-case.js";
import { ProcessedDataNotFoundError } from "../use-cases/errors/processed-data-not-found-error.js";

export function scoreRoutes(fastify: FastifyInstance): void {
	fastify.post("/score", async (request, reply) => {
		const userId = request.headers["x-user-id"];

		if (!userId || typeof userId !== "string") {
			return reply.status(401).send({ error: "Missing x-user-id header" });
		}

		const parseResult = WalletContextInputSchema.safeParse(request.body);

		if (!parseResult.success) {
			return reply.status(400).send({
				error: "Invalid wallet context input",
				details: parseResult.error.flatten().fieldErrors,
			});
		}

		const orchestrator = createCalculateScore();
		const { processedData, cachedResult } = await orchestrator.execute({
			walletContext: parseResult.data,
			userId,
		});

		const status = cachedResult ? 200 : 201;

		return reply.status(status).send({
			processId: processedData.analysisRequestId,
			chain: processedData.chain,
			address: processedData.address,
			score: processedData.score,
			confidence: processedData.confidence,
			reasoning: processedData.reasoning,
			positiveFactors: processedData.positiveFactors,
			riskFactors: processedData.riskFactors,
			modelVersion: processedData.modelVersion,
			promptVersion: processedData.promptVersion,
			cachedResult,
			validUntil: processedData.validUntil.toISOString(),
			createdAt: processedData.createdAt.toISOString(),
		});
	});

	fastify.get<{ Params: { processId: string } }>(
		"/score/:processId",
		async (request, reply) => {
			const { processId } = request.params;

			const processedDataRepo = new ProcessedDataPrismaRepository();
			const getScoreByProcessId = new GetScoreByProcessIdUseCase(processedDataRepo);

			try {
				const processedData = await getScoreByProcessId.execute({ analysisRequestId: processId });

				return reply.status(200).send({
					processId: processedData.analysisRequestId,
					chain: processedData.chain,
					address: processedData.address,
					score: processedData.score,
					confidence: processedData.confidence,
					reasoning: processedData.reasoning,
					positiveFactors: processedData.positiveFactors,
					riskFactors: processedData.riskFactors,
					modelVersion: processedData.modelVersion,
					promptVersion: processedData.promptVersion,
					cachedResult: false,
					validUntil: processedData.validUntil.toISOString(),
					createdAt: processedData.createdAt.toISOString(),
				});
			} catch (error) {
				if (error instanceof ProcessedDataNotFoundError) {
					return reply.status(404).send({ error: "Score not found" });
				}
				throw error;
			}
		},
	);
}
