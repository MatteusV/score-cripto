import { randomUUID } from "node:crypto";
import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisSummary } from "../../use-cases/analysis-request/list-analyses-use-case";
import type {
  AnalysisRequestRepository,
  CompleteAnalysisRequestData,
  CreateAnalysisRequestData,
} from "../analysis-request-repository";

export class AnalysisRequestInMemoryRepository
  implements AnalysisRequestRepository
{
  items: AnalysisRequest[] = [];
  private readonly counters: Map<string, number> = new Map();

  async create(data: CreateAnalysisRequestData): Promise<AnalysisRequest> {
    const item: AnalysisRequest = {
      id: randomUUID(),
      userId: data.userId,
      publicId: null,
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

  async createWithPublicId(
    data: CreateAnalysisRequestData
  ): Promise<AnalysisRequest> {
    const current = this.counters.get(data.userId) ?? 0;
    const next = current + 1;
    this.counters.set(data.userId, next);

    const item: AnalysisRequest = {
      id: randomUUID(),
      userId: data.userId,
      publicId: next,
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

  async findByUserChainAddress(
    userId: string,
    chain: string,
    address: string
  ): Promise<AnalysisRequest | null> {
    const result = this.items
      .filter(
        (item) =>
          item.userId === userId &&
          item.chain === chain &&
          item.address === address
      )
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
      .at(0);

    return result ?? null;
  }

  async findByUserIdAndPublicId(
    userId: string,
    publicId: number
  ): Promise<AnalysisRequest | null> {
    const result = this.items.find(
      (item) => item.userId === userId && item.publicId === publicId
    );

    return result ?? null;
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

  async listByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: AnalysisRequest[]; total: number }> {
    const completed = this.items
      .filter((item) => item.userId === userId && item.status === "COMPLETED")
      .sort((a, b) => {
        const aTime = (a.completedAt ?? a.requestedAt).getTime();
        const bTime = (b.completedAt ?? b.requestedAt).getTime();
        return bTime - aTime; // most recent first
      });

    const total = completed.length;
    const offset = (page - 1) * limit;
    const items = completed.slice(offset, offset + limit);

    return { items, total };
  }

  async summarizeByUserId(
    userId: string
  ): Promise<{ summary: AnalysisSummary }> {
    const completed = this.items.filter(
      (item) => item.userId === userId && item.status === "COMPLETED"
    );

    const total = completed.length;

    if (total === 0) {
      return {
        summary: { total: 0, avgScore: 0, trusted: 0, attention: 0, risky: 0 },
      };
    }

    const scores = completed.map((item) => item.score as number);
    const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / total);
    const trusted = scores.filter((s) => s >= 70).length;
    const attention = scores.filter((s) => s >= 40 && s < 70).length;
    const risky = scores.filter((s) => s < 40).length;

    return { summary: { total, avgScore, trusted, attention, risky } };
  }
}
