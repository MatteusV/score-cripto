import type { AnalysisRequestDTO } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";

const DEFAULT_VALIDITY_HOURS = 24;

interface FindCachedAnalysisUseCaseRequest {
  address: string;
  chain: string;
  userId: string;
}

type FindCachedAnalysisUseCaseResponse =
  | { kind: "completed"; analysisRequest: AnalysisRequestDTO }
  | { kind: "pending"; analysisRequest: AnalysisRequestDTO }
  | { kind: "miss" };

export class FindCachedAnalysisUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute(
    data: FindCachedAnalysisUseCaseRequest
  ): Promise<FindCachedAnalysisUseCaseResponse> {
    const analysis = await this.repository.findByUserChainAddress(
      data.userId,
      data.chain,
      data.address
    );

    if (!analysis) {
      return { kind: "miss" };
    }

    if (analysis.status === "PENDING" || analysis.status === "PROCESSING") {
      return { kind: "pending", analysisRequest: analysis };
    }

    if (analysis.status === "COMPLETED" && analysis.completedAt) {
      const validityHours = Number(
        process.env.SCORE_VALIDITY_HOURS ?? DEFAULT_VALIDITY_HOURS
      );
      const expiresAt = new Date(
        analysis.completedAt.getTime() + validityHours * 60 * 60 * 1000
      );

      if (new Date() <= expiresAt) {
        return { kind: "completed", analysisRequest: analysis };
      }
    }

    return { kind: "miss" };
  }
}
