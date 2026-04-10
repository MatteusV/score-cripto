import { randomUUID } from "node:crypto";
import type { UsageRecord } from "../../generated/prisma/client";
import type { UsageRecordUncheckedCreateInput } from "../../generated/prisma/models/UsageRecord";
import type { UsageRepository } from "../usage-repository";

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

  async findByUserAndPeriod(
    userId: string,
    periodYear: number,
    periodMonth: number
  ) {
    return (
      this.items.find(
        (r) =>
          r.userId === userId &&
          r.periodYear === periodYear &&
          r.periodMonth === periodMonth
      ) ?? null
    );
  }
}
