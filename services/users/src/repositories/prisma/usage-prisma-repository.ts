import type { PrismaClient } from "../../generated/prisma/client";
import type { UsageRecordUncheckedCreateInput } from "../../generated/prisma/models/UsageRecord";
import type { UsageRepository } from "../usage-repository";

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
}
