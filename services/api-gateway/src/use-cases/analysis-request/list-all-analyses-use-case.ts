import type { AnalysisRequestDTO } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";

interface ListAllAnalysesInput {
  limit: number;
  page: number;
  status?: string;
  userId?: string;
}

interface ListAllAnalysesOutput {
  items: AnalysisRequestDTO[];
  limit: number;
  page: number;
  total: number;
}

export class ListAllAnalysesUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute(input: ListAllAnalysesInput): Promise<ListAllAnalysesOutput> {
    const { page, limit, status, userId } = input;

    const { items, total } = await this.repository.listAll(page, limit, {
      status,
      userId,
    });

    return { items, total, page, limit };
  }
}
