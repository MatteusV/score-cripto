import { randomUUID } from "node:crypto";
import type { AnalysisRequest } from "../../generated/prisma/client";
import type {
  AnalysisRequestRepository,
  CompleteAnalysisRequestData,
  CreateAnalysisRequestData,
} from "../analysis-request-repository";

export class AnalysisRequestInMemoryRepository
  implements AnalysisRequestRepository
{
  items: AnalysisRequest[] = [];

  async create(data: CreateAnalysisRequestData): Promise<AnalysisRequest> {
    const item: AnalysisRequest = {
      id: randomUUID(),
      userId: data.userId,
      chain: data.chain,
      address: data.address,
      status: "PENDING",
      requestedAt: new Date(),
      completedAt: null,
      failedAt: null,
      failureReason: null,
      score: null,
      confidence: null,
      reasoning: null,
      positiveFactors: null,
      riskFactors: null,
      modelVersion: null,
      promptVersion: null,
    };

    this.items.push(item);

    return item;
  }

  async findActive(
    userId: string,
    chain: string,
    address: string
  ): Promise<AnalysisRequest | null> {
    const result = this.items
      .filter(
        (item) =>
          item.userId === userId &&
          item.chain === chain &&
          item.address === address &&
          (item.status === "PENDING" || item.status === "PROCESSING")
      )
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .at(0);

    return result ?? null;
  }

  async findById(id: string): Promise<AnalysisRequest | null> {
    const result = this.items.find((item) => item.id === id);

    return result ?? null;
  }

  async markCompleted(
    id: string,
    result: CompleteAnalysisRequestData
  ): Promise<AnalysisRequest> {
    const index = this.items.findIndex((item) => item.id === id);
    const item = this.items[index];

    const updated: AnalysisRequest = {
      ...item,
      status: "COMPLETED",
      completedAt: new Date(),
      score: result.score,
      confidence: result.confidence,
      reasoning: result.reasoning,
      positiveFactors: result.positiveFactors,
      riskFactors: result.riskFactors,
      modelVersion: result.modelVersion,
      promptVersion: result.promptVersion,
    };

    this.items[index] = updated;

    return updated;
  }

  async markFailed(id: string, reason: string): Promise<AnalysisRequest> {
    const index = this.items.findIndex((item) => item.id === id);
    const item = this.items[index];

    const updated: AnalysisRequest = {
      ...item,
      status: "FAILED",
      failedAt: new Date(),
      failureReason: reason,
    };

    this.items[index] = updated;

    return updated;
  }
}
