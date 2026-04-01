import type { AnalysisRequest } from "../../generated/prisma/client";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

interface GetAnalysisByChainAddressUserUseCaseRequest {
  address: string;
  chain: string;
  userId: string;
}

interface GetAnalysisByChainAddressUserUseCaseResponse {
  analysisRequest: AnalysisRequest | null;
}

export class GetAnalysisByChainAddressUserUseCase {
  private readonly analysisRequestRepository: AnalysisRequestRepository;

  constructor(analysisRequestRepository: AnalysisRequestRepository) {
    this.analysisRequestRepository = analysisRequestRepository;
  }

  async execute(
    data: GetAnalysisByChainAddressUserUseCaseRequest
  ): Promise<GetAnalysisByChainAddressUserUseCaseResponse> {
    const analysisRequest = await this.analysisRequestRepository.findByIndex({
      chain: data.chain,
      address: data.address,
      userId: data.userId,
    });

    return { analysisRequest };
  }
}
