import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

export interface AnalysisSummary {
  attention: number; // score >= 40 && < 70
  avgScore: number;
  risky: number; // score < 40
  total: number;
  trusted: number; // score >= 70
}

export interface AnalysisListItem {
  address: string;
  chain: string;
  completedAt: Date;
  id: string;
  requestedAt: Date;
  score: number;
}

export interface ListAnalysesResult {
  data: AnalysisListItem[];
  pagination: { page: number; limit: number; total: number };
  summary: AnalysisSummary;
}

export class ListAnalysesUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<ListAnalysesResult> {
    const { userId, page, limit } = params;

    const { items: all, total } = await this.repository.listByUserId(
      userId,
      page,
      limit
    );
    const { summary } = await this.repository.summarizeByUserId(userId);

    return {
      summary,
      data: all.map((item) => ({
        id: item.id,
        chain: item.chain,
        address: item.address,
        score: item.score as number,
        requestedAt: item.requestedAt,
        completedAt: item.completedAt as Date,
      })),
      pagination: { page, limit, total },
    };
  }
}
