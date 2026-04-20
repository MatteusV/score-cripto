import { randomUUID } from "node:crypto";
import type { UsageRecord } from "../../generated/prisma/client.js";
import type { UsageRecordUncheckedCreateInput } from "../../generated/prisma/models/UsageRecord.js";
import type { UsageRepository } from "../usage-repository.js";

export class UsageInMemoryRepository implements UsageRepository {
  items: UsageRecord[] = [];

  async create(data: UsageRecordUncheckedCreateInput) {
    const record: UsageRecord = {
      id: data.id ?? randomUUID(),
      userId: data.userId,
      analysisCount: data.analysisCount ?? 0,
      periodMonth: data.periodMonth,
      periodYear: data.periodYear,
      resetAt: new Date(data.resetAt as string | Date),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(record);
    return record;
  }

  async findByUserAndPeriod(userId: string, periodYear: number, periodMonth: number) {
    return (
      this.items.find(
        (r) => r.userId === userId && r.periodYear === periodYear && r.periodMonth === periodMonth,
      ) ?? null
    );
  }

  async increment(id: string) {
    const record = this.items.find((r) => r.id === id);
    if (!record) {
      throw new Error(`UsageRecord ${id} not found`);
    }
    record.analysisCount += 1;
    record.updatedAt = new Date();
    return record;
  }

  async reset(id: string, resetAt: Date) {
    const record = this.items.find((r) => r.id === id);
    if (!record) {
      throw new Error(`UsageRecord ${id} not found`);
    }
    record.analysisCount = 0;
    record.resetAt = resetAt;
    record.updatedAt = new Date();
    return record;
  }
}
