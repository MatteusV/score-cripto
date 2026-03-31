import { randomUUID } from "node:crypto";
import type { ProcessedData } from "../../generated/prisma/client";
import type { ProcessedDataRepository } from "../processed-data-repository";

export class ProcessedDataInMemoryRepository
  implements ProcessedDataRepository
{
  items: ProcessedData[] = [];

  async create(data: Omit<ProcessedData, "id" | "createdAt">) {
    const processedData: ProcessedData = {
      id: randomUUID(),
      createdAt: new Date(),
      ...data,
    };

    this.items.push(processedData);

    return processedData;
  }

  async findCachedScore(data: {
    chain: string;
    address: string;
    walletContextHash: string;
  }) {
    const now = new Date();

    const result = this.items
      .filter(
        (item) =>
          item.chain === data.chain &&
          item.address === data.address &&
          item.validUntil > now
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .at(0);

    return result ?? null;
  }

  async findByAnalysisRequestId(analysisRequestId: string) {
    const result = this.items.find(
      (item) => item.analysisRequestId === analysisRequestId
    );

    return result ?? null;
  }
}
