import { AnalysisRequestPrismaRepository } from "../../repositories/prisma/analysis-request-prisma-repository.js";
import { prisma } from "../../services/database.js";
import { CompleteAnalysisRequestUseCase } from "../analysis-request/complete-analysis-request-use-case.js";

export function makeCompleteAnalysisUseCase() {
  const analysisRepository = new AnalysisRequestPrismaRepository(prisma);

  const completeAnalysisUseCase = new CompleteAnalysisRequestUseCase(
    analysisRepository
  );

  return completeAnalysisUseCase;
}
