import { randomUUID } from "node:crypto";
import type { ProcessedData } from "../../generated/prisma/client";
import type { ProcessedDataUncheckedCreateInput } from "../../generated/prisma/models";
import type { ProcessedDataRepository } from "../processed-data-repository";

export class ProcessedDataInMemoryRepository
  implements ProcessedDataRepository
{
  items: ProcessedData[] = [];

  async create(data: ProcessedDataUncheckedCreateInput) {
    const processedData = {
      ...data,
      id: data.id ?? randomUUID(),
      createdAt: new Date(),
      validUntil: new Date(data.validUntil),
    } as ProcessedData;

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
          item.walletContextHash === data.walletContextHash &&
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
