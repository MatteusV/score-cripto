import { AnalysisRequestPrismaRepository } from "../../repositories/prisma/analysis-request-prisma-repository";
import { prisma } from "../../services/database";
import { CompleteAnalysisRequestUseCase } from "../analysis-request/complete-analysis-request-use-case";

export function makeCompleteAnalysisUseCase() {
  const analysisRepository = new AnalysisRequestPrismaRepository(prisma);

  const completeAnalysisUseCase = new CompleteAnalysisRequestUseCase(
    analysisRepository
  );

  return completeAnalysisUseCase;
}
