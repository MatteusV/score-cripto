import { randomUUID } from "node:crypto";
import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../analysis-request-repository";

export class AnalysisRequestInMemoryRepository
  implements AnalysisRequestRepository
{
  items: AnalysisRequest[] = [];

  async create(data: Omit<AnalysisRequest, "id">) {
    const id = randomUUID();
    const analysisRequest = { id, ...data };

    this.items.push(analysisRequest);

    const analysisCreated = this.items.find((data) => data.id === id);

    if (!analysisCreated) {
      return null;
    }

    return analysisRequest;
  }

  async findByIndex(data: { chain: string; address: string; userId: string }) {
    const analysisRequest = this.items.find(
      (item) =>
        item.chain === data.chain &&
        item.address === data.address &&
        item.userId === data.userId
    );

    if (!analysisRequest) {
      return null;
    }

    return analysisRequest;
  }

  async findById(id: string) {
    const analysisRequest = this.items.find((item) => item.id === id);

    if (!analysisRequest) {
      return null;
    }

    return analysisRequest;
  }

  async update(id: string, data: Partial<AnalysisRequest>) {
    const analysisRequest = this.items.find((item) => item.id === id);

    if (!analysisRequest) {
      return null;
    }

    Object.assign(analysisRequest, data);

    return analysisRequest;
  }

  async listByUserId(userId: string, page: number, limit: number) {
    const userItems = this.items
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    const offset = (page - 1) * limit;
    const items = userItems.slice(offset, offset + limit);

    return { items, total: userItems.length };
  }

  async countByUserThisMonth(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.items.filter(
      (item) =>
        item.userId === userId &&
        item.requestedAt >= startOfMonth &&
        (item.status === "COMPLETED" || item.status === "FAILED")
    ).length;
  }
}
