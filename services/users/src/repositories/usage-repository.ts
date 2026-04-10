import type { UsageRecord } from "../generated/prisma/browser";
import type { UsageRecordUncheckedCreateInput } from "../generated/prisma/models/UsageRecord";

export interface UsageRepository {
  create: (data: UsageRecordUncheckedCreateInput) => Promise<UsageRecord>;
  findByUserAndPeriod: (
    userId: string,
    periodYear: number,
    periodMonth: number
  ) => Promise<UsageRecord | null>;
}
