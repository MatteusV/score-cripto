import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { publishScoreCalculated } from "../events/publisher.js";
import { WalletContextInputSchema } from "../schemas/score.js";
import { prisma as prismaInstance } from "../services/database.js";
import { scoreWithAI, scoreWithHeuristic } from "../services/scoring.js";

function hashWalletContext(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function computeValidUntil(): Date {
  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + config.scoreValidityHours);
  return validUntil;
}

export function scoreRoutes(fastify: FastifyInstance): void {
  fastify.post("/score", async (request, reply) => {
    const parseResult = WalletContextInputSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid wallet context input",
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const input = parseResult.data;
    const contextHash = hashWalletContext(input);

    // Check for valid existing score
    const existingScore = await prismaInstance.processedData.findFirst({
      where: {
        chain: input.chain,
        address: input.address,
        validUntil: { gt: new Date() },
        analysisRequest: {
          is: {
            walletContextHash: contextHash,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: { analysisRequest: true },
    });

    if (existingScore) {
      return reply.status(200).send({
        processId: existingScore.analysisRequestId,
        chain: existingScore.chain,
        address: existingScore.address,
        score: existingScore.score,
        confidence: existingScore.confidence,
        reasoning: existingScore.reasoning,
        positiveFactors: existingScore.positiveFactors,
        riskFactors: existingScore.riskFactors,
        modelVersion: existingScore.modelVersion,
        promptVersion: existingScore.promptVersion,
        cachedResult: true,
        validUntil: existingScore.validUntil.toISOString(),
        createdAt: existingScore.createdAt.toISOString(),
      });
    }

    // Create analysis request
    const analysisRequest = await prismaInstance.analysisRequest.create({
      data: {
        chain: input.chain,
        address: input.address,
        status: "PROCESSING",
        walletContextHash: contextHash,
      },
    });

    let scoringResult: Awaited<ReturnType<typeof scoreWithAI>>;
    let _usedFallback = false;

    try {
      scoringResult = await scoreWithAI(input);
    } catch (error) {
      console.error(
        "[Score] AI scoring failed, using heuristic fallback:",
        (error as Error).message
      );
      _usedFallback = true;
      const heuristicOutput = scoreWithHeuristic(input);
      scoringResult = {
        output: heuristicOutput,
        modelVersion: "heuristic-v1",
        promptVersion: "heuristic",
        tokensUsed: 0,
        cost: 0,
        durationMs: 0,
      };
    }

    const validUntil = computeValidUntil();

    // Persist the result
    const processedData = await prismaInstance.processedData.create({
      data: {
        analysisRequestId: analysisRequest.id,
        chain: input.chain,
        address: input.address,
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
        validUntil,
      },
    });

    // Update analysis request status
    await prismaInstance.analysisRequest.update({
      where: { id: analysisRequest.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Publish event (fire and forget)
    publishScoreCalculated({
      processId: analysisRequest.id,
      chain: input.chain,
      address: input.address,
      score: scoringResult.output.score,
      confidence: scoringResult.output.confidence,
      modelVersion: scoringResult.modelVersion,
      promptVersion: scoringResult.promptVersion,
    }).catch((err) => {
      console.error("[Score] Failed to publish event:", err);
    });

    return reply.status(201).send({
      processId: analysisRequest.id,
      chain: input.chain,
      address: input.address,
      score: scoringResult.output.score,
      confidence: scoringResult.output.confidence,
      reasoning: scoringResult.output.reasoning,
      positiveFactors: scoringResult.output.positiveFactors,
      riskFactors: scoringResult.output.riskFactors,
      modelVersion: scoringResult.modelVersion,
      promptVersion: scoringResult.promptVersion,
      cachedResult: false,
      validUntil: validUntil.toISOString(),
      createdAt: processedData.createdAt.toISOString(),
    });
  });

  fastify.get<{ Params: { processId: string } }>(
    "/score/:processId",
    async (request, reply) => {
      const { processId } = request.params;

      const processedData = await prismaInstance.processedData.findFirst({
        where: { analysisRequestId: processId },
        include: { analysisRequest: true },
      });

      if (!processedData) {
        return reply.status(404).send({ error: "Score not found" });
      }

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
    }
  );
}

// Export for testing
export { computeValidUntil, hashWalletContext };
