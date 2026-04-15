import { randomUUID } from "node:crypto";
import type {
  AnalysisRequestDTO,
  AnalysisSummary,
} from "../../domain/analysis-request";
import type {
  AnalysisRequestRepository,
  CompleteAnalysisRequestData,
  CreateAnalysisRequestData,
} from "../analysis-request-repository";

export class AnalysisRequestInMemoryRepository
  implements AnalysisRequestRepository
{
  items: AnalysisRequestDTO[] = [];
  private readonly counters: Map<string, number> = new Map();

  async create(data: CreateAnalysisRequestData): Promise<AnalysisRequestDTO> {
    const item: AnalysisRequestDTO = {
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
  ): Promise<AnalysisRequestDTO> {
    const current = this.counters.get(data.userId) ?? 0;
    const next = current + 1;
    this.counters.set(data.userId, next);

    const item: AnalysisRequestDTO = {
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
  ): Promise<AnalysisRequestDTO | null> {
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
  ): Promise<AnalysisRequestDTO | null> {
    const result = this.items.find(
      (item) => item.userId === userId && item.publicId === publicId
    );

    return result ?? null;
  }

  async findActive(
    userId: string,
    chain: string,
    address: string
  ): Promise<AnalysisRequestDTO | null> {
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

  async findById(id: string): Promise<AnalysisRequestDTO | null> {
    const result = this.items.find((item) => item.id === id);

    return result ?? null;
  }

  async markCompleted(
    id: string,
    result: CompleteAnalysisRequestData
  ): Promise<AnalysisRequestDTO> {
    const index = this.items.findIndex((item) => item.id === id);
    const item = this.items[index];

    const updated: AnalysisRequestDTO = {
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

  async markFailed(id: string, reason: string): Promise<AnalysisRequestDTO> {
    const index = this.items.findIndex((item) => item.id === id);
    const item = this.items[index];

    const updated: AnalysisRequestDTO = {
      ...item,
      status: "FAILED",
      failedAt: new Date(),
      failureReason: reason,
    };

    this.items[index] = updated;

    return updated;
  }

  async markStaleAsFailed(olderThan: Date, reason: string): Promise<number> {
    let count = 0;
    for (const item of this.items) {
      if (item.status === "PENDING" && item.requestedAt < olderThan) {
        item.status = "FAILED";
        item.failedAt = new Date();
        item.failureReason = reason;
        count++;
      }
    }
    return count;
  }

  async listByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: AnalysisRequestDTO[]; total: number }> {
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

  async listAll(
    page: number,
    limit: number,
    filters?: { status?: string; userId?: string }
  ): Promise<{ items: AnalysisRequestDTO[]; total: number }> {
    const filtered = this.items
      .filter((item) => {
        if (filters?.status && item.status !== filters.status) return false;
        if (filters?.userId && item.userId !== filters.userId) return false;
        return true;
      })
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);

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
