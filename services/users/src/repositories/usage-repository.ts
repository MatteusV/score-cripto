import type { UsageRecord } from "../generated/prisma/browser.js";
import type { UsageRecordUncheckedCreateInput } from "../generated/prisma/models/UsageRecord.js";

export interface UsageRepository {
  create: (data: UsageRecordUncheckedCreateInput) => Promise<UsageRecord>;
  findByUserAndPeriod: (
    userId: string,
    periodYear: number,
    periodMonth: number
  ) => Promise<UsageRecord | null>;
  increment: (id: string) => Promise<UsageRecord>;
  reset: (id: string, resetAt: Date) => Promise<UsageRecord>;
}
