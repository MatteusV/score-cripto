import type { ProcessedData } from "../../generated/prisma/client.js";
import type { ProcessedDataRepository } from "../../repositories/processed-data-repository.js";
import { ProcessedDataNotFoundError } from "../errors/processed-data-not-found-error.js";

interface GetScoreByProcessIdUseCaseRequest {
  processId: string;
}

interface GetScoreByProcessIdUseCaseResponse {
  processedData: ProcessedData;
}

export class GetScoreByProcessIdUseCase {
  private readonly processedDataRepository: ProcessedDataRepository;

  constructor(processedDataRepository: ProcessedDataRepository) {
    this.processedDataRepository = processedDataRepository;
  }

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
