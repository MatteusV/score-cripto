import type { ProcessedData } from "../../generated/prisma/client";
import type { ProcessedDataRepository } from "../../repositories/processed-data-repository";

interface GetCachedScoreUseCaseRequest {
  address: string;
  chain: string;
  walletContextHash: string;
}

export class GetCachedScoreUseCase {
  constructor(
    private readonly processedDataRepository: ProcessedDataRepository
  ) {}

  async execute({
    chain,
    address,
    walletContextHash,
  }: GetCachedScoreUseCaseRequest): Promise<ProcessedData | null> {
    return this.processedDataRepository.findCachedScore({
      chain,
      address,
      walletContextHash,
    });
  }
}
