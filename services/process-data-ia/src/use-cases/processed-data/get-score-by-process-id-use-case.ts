import type { ProcessedData } from "../../generated/prisma/client";
import type { ProcessedDataRepository } from "../../repositories/processed-data-repository";
import { ProcessedDataNotFoundError } from "../errors/processed-data-not-found-error";

interface GetScoreByProcessIdUseCaseRequest {
  processId: string;
}

interface GetScoreByProcessIdUseCaseResponse {
  processedData: ProcessedData;
}

export class GetScoreByProcessIdUseCase {
  constructor(
    private readonly processedDataRepository: ProcessedDataRepository
  ) {}

  async execute({
    processId,
  }: GetScoreByProcessIdUseCaseRequest): Promise<GetScoreByProcessIdUseCaseResponse> {
    const processedData =
      await this.processedDataRepository.findByAnalysisRequestId(processId);

    if (!processedData) {
      throw new ProcessedDataNotFoundError();
    }

    return { processedData };
  }
}
