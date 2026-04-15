import type { AnalysisRequestDTO } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";

interface ListAllAnalysesInput {
  page: number;
  limit: number;
  status?: string;
  userId?: string;
}

interface ListAllAnalysesOutput {
  items: AnalysisRequestDTO[];
  total: number;
  page: number;
  limit: number;
}

export class ListAllAnalysesUseCase {
  constructor(private readonly repository: AnalysisRequestRepository) {}

  async execute(input: ListAllAnalysesInput): Promise<ListAllAnalysesOutput> {
    const { page, limit, status, userId } = input;

    const { items, total } = await this.repository.listAll(page, limit, {
      status,
      userId,
    });

    return { items, total, page, limit };
  }
}
