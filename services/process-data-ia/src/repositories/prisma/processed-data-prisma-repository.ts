import type { ProcessedData } from "../../generated/prisma/client";
import type { ProcessedDataUncheckedCreateInput } from "../../generated/prisma/models";
import { prisma } from "../../services/database";
import type {
  FindCachedScoreData,
  ProcessedDataRepository,
} from "../processed-data-repository";

export class ProcessedDataPrismaRepository implements ProcessedDataRepository {
  async create(
    data: ProcessedDataUncheckedCreateInput
  ): Promise<ProcessedData> {
    const processedData = await prisma.processedData.create({
      data,
    });

    return processedData;
  }

  async findByAnalysisRequestId(
    analysisRequestId: string
  ): Promise<ProcessedData | null> {
    const processedData = await prisma.processedData.findFirst({
      where: {
        analysisRequestId,
      },
    });

    return processedData ?? null;
  }

  async findCachedScore(
    data: FindCachedScoreData
  ): Promise<ProcessedData | null> {
    const now = new Date();

    const result = await prisma.processedData.findFirst({
      where: {
        chain: data.chain,
        address: data.address,
        validUntil: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return result ?? null;
  }
}
