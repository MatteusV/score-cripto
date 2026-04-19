import type { ProcessedData } from "../../generated/prisma/client.js";
import type { ProcessedDataRepository } from "../../repositories/processed-data-repository.js";

interface GetCachedScoreUseCaseRequest {
  address: string;
  chain: string;
  walletContextHash: string;
}

export class GetCachedScoreUseCase {
  private readonly processedDataRepository: ProcessedDataRepository;

  constructor(processedDataRepository: ProcessedDataRepository) {
    this.processedDataRepository = processedDataRepository;
  }

  async execute({
    chain,
    address,
    walletContextHash,
  }: GetCachedScoreUseCaseRequest): Promise<ProcessedData | null> {
    return await this.processedDataRepository.findCachedScore({
      chain,
      address,
      walletContextHash,
    });
  }
}
