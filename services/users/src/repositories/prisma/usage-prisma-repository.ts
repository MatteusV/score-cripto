import type { PrismaClient } from "../../generated/prisma/client.js";
import type { UsageRecordUncheckedCreateInput } from "../../generated/prisma/models/UsageRecord.js";
import type { UsageRepository } from "../usage-repository.js";

export class UsagePrismaRepository implements UsageRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: UsageRecordUncheckedCreateInput) {
    return this.prisma.usageRecord.create({ data });
  }

  async findByUserAndPeriod(
    userId: string,
    periodYear: number,
    periodMonth: number
  ) {
    return this.prisma.usageRecord.findUnique({
      where: {
        userId_periodYear_periodMonth: { userId, periodYear, periodMonth },
      },
    });
  }

  async increment(id: string) {
    return this.prisma.usageRecord.update({
      where: { id },
      data: { analysisCount: { increment: 1 } },
    });
  }

  async reset(id: string, resetAt: Date) {
    return this.prisma.usageRecord.update({
      where: { id },
      data: { analysisCount: 0, resetAt },
    });
  }
}
