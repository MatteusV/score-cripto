import { randomUUID } from "node:crypto";
import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../analysis-request-repository";

export class AnalysisRequestInMemoryRepository
  implements AnalysisRequestRepository
{
  public items: AnalysisRequest[] = [];

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
}
