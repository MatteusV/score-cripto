import type {
  AnalysisRequest,
  PrismaClient,
} from "../../generated/prisma/client";
import type {
  AnalysisRequestRepository,
  FindByIndexData,
  ListByUserResult,
} from "../analysis-request-repository";
export class AnalysisRequestPrismaRepository
  implements AnalysisRequestRepository
{
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async countByUserThisMonth(userId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return await this.prisma.analysisRequest.count({
      where: {
        userId,
        requestedAt: { gte: startOfMonth },
        status: { in: ["COMPLETED", "FAILED"] },
      },
    });
  }

  async create(
    data: Omit<AnalysisRequest, "id">
  ): Promise<AnalysisRequest | null> {
    const analysisRequest = await this.prisma.analysisRequest.create({
      data,
    });

    if (!analysisRequest) {
      return null;
    }

    return analysisRequest;
  }

  async findById(id: string): Promise<AnalysisRequest | null> {
    const analysisRequest = await this.prisma.analysisRequest.findUnique({
      where: {
        id,
      },
    });

    if (!analysisRequest) {
      return null;
    }

    return analysisRequest;
  }

  async findByIndex({
    address,
    chain,
    userId,
  }: FindByIndexData): Promise<AnalysisRequest | null> {
    const analysisRequest = await this.prisma.analysisRequest.findFirst({
      where: {
        chain,
        address,
        userId,
      },
    });

    if (!analysisRequest) {
      return null;
    }

    return analysisRequest;
  }

  async listByUserId(
    userId: string,
    page: number,
    limit: number
  ): Promise<ListByUserResult> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.analysisRequest.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { requestedAt: "desc" },
      }),
      this.prisma.analysisRequest.count({ where: { userId } }),
    ]);

    return { items, total };
  }

  async update(
    id: string,
    data: Partial<AnalysisRequest>
  ): Promise<AnalysisRequest | null> {
    const analysisRequestExists = await this.prisma.analysisRequest.findUnique({
      where: {
        id,
      },
    });

    if (!analysisRequestExists) {
      return null;
    }

    const analysisRequestUpdated = await this.prisma.analysisRequest.update({
      where: {
        id,
      },
      data,
    });

    return analysisRequestUpdated;
  }
}
