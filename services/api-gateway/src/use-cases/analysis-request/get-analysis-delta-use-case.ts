import type { AnalysisSummary } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";

export interface AnalysisDelta {
  attention: number;
  avgScore: number;
  risky: number;
  total: number;
  trusted: number;
}

export interface AnalysisDeltaWindow {
  current: { from: Date; to: Date };
  days: number;
  previous: { from: Date; to: Date };
}

export interface GetAnalysisDeltaResult {
  current: AnalysisSummary;
  delta: AnalysisDelta;
  previous: AnalysisSummary;
  window: AnalysisDeltaWindow;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class GetAnalysisDeltaUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute(params: {
    days: number;
    now?: Date;
    userId: string;
  }): Promise<GetAnalysisDeltaResult> {
    const { userId, days } = params;
    const now = params.now ?? new Date();

    const currentTo = now;
    const currentFrom = new Date(now.getTime() - days * DAY_MS);
    const previousTo = currentFrom;
    const previousFrom = new Date(now.getTime() - 2 * days * DAY_MS);

    const [{ summary: current }, { summary: previous }] = await Promise.all([
      this.repository.summarizeByUserIdInRange(userId, currentFrom, currentTo),
      this.repository.summarizeByUserIdInRange(
        userId,
        previousFrom,
        previousTo
      ),
    ]);

    return {
      window: {
        days,
        current: { from: currentFrom, to: currentTo },
        previous: { from: previousFrom, to: previousTo },
      },
      current,
      previous,
      delta: {
        total: current.total - previous.total,
        avgScore: current.avgScore - previous.avgScore,
        trusted: current.trusted - previous.trusted,
        attention: current.attention - previous.attention,
        risky: current.risky - previous.risky,
      },
    };
  }
}
