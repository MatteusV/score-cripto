import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository";

export interface AnalysisSummary {
  total: number;
  avgScore: number;
  trusted: number;   // score >= 70
  attention: number; // score >= 40 && < 70
  risky: number;     // score < 40
}

export interface AnalysisListItem {
  id: string;
  chain: string;
  address: string;
  score: number;
  requestedAt: Date;
  completedAt: Date;
}

export interface ListAnalysesResult {
  summary: AnalysisSummary;
  data: AnalysisListItem[];
  pagination: { page: number; limit: number; total: number };
}

export class ListAnalysesUseCase {
  constructor(private readonly repository: AnalysisRequestRepository) {}

  async execute(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<ListAnalysesResult> {
    const { userId, page, limit } = params;

    const { items: all, total } = await this.repository.listByUserId(userId, page, limit);
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
