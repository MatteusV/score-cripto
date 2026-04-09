import type {
  AnalysisRequest,
  PrismaClient,
} from "../../generated/prisma/client";

import type {
  AnalysisRequestRepository,
  CompleteAnalysisRequestData,
  CreateAnalysisRequestData,
} from "../analysis-request-repository";

export class AnalysisRequestPrismaRepository
  implements AnalysisRequestRepository
{
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async create(data: CreateAnalysisRequestData): Promise<AnalysisRequest> {
    return await this.prisma.analysisRequest.create({
      data: {
        userId: data.userId,
        chain: data.chain,
        address: data.address,
        status: "PENDING",
      },
    });
  }

  async findActive(
    userId: string,
    chain: string,
    address: string
  ): Promise<AnalysisRequest | null> {
    const result = await this.prisma.analysisRequest.findFirst({
      where: {
        userId,
        chain,
        address,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      orderBy: { requestedAt: "desc" },
    });

    return result ?? null;
  }

  async findById(id: string): Promise<AnalysisRequest | null> {
    const result = await this.prisma.analysisRequest.findUnique({
      where: { id },
    });

    return result ?? null;
  }

  async markCompleted(
    id: string,
    result: CompleteAnalysisRequestData
  ): Promise<AnalysisRequest> {
    return await this.prisma.analysisRequest.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        score: result.score,
        confidence: result.confidence,
        reasoning: result.reasoning,
        positiveFactors: result.positiveFactors,
        riskFactors: result.riskFactors,
        modelVersion: result.modelVersion,
        promptVersion: result.promptVersion,
      },
    });
  }

  async markFailed(id: string, reason: string): Promise<AnalysisRequest> {
    return await this.prisma.analysisRequest.update({
      where: { id },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: reason,
      },
    });
  }
}
