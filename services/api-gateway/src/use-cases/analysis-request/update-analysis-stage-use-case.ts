import type { AnalysisRequestDTO } from "../../domain/analysis-request.js";
import type { AnalysisRequestRepository } from "../../repositories/analysis-request-repository.js";

interface UpdateAnalysisStageUseCaseRequest {
  id: string;
  stage: string;
  state: string;
}

interface UpdateAnalysisStageUseCaseResponse {
  analysisRequest: AnalysisRequestDTO | null;
}

export class UpdateAnalysisStageUseCase {
  private readonly repository: AnalysisRequestRepository;

  constructor(repository: AnalysisRequestRepository) {
    this.repository = repository;
  }

  async execute({
    id,
    stage,
    state,
  }: UpdateAnalysisStageUseCaseRequest): Promise<UpdateAnalysisStageUseCaseResponse> {
    const analysisRequest = await this.repository.updateStage(id, stage, state);
    return { analysisRequest };
  }
}
