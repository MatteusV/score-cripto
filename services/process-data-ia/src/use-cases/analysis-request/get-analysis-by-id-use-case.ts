import type { AnalysisRequest } from "../../generated/prisma/client";

type GetAnalysisByIdUseCaseRequest = {
	analysisRequestId: string;
};

type GetAnalysisByIdUseCaseResponse = {
	analysisRequest: AnalysisRequest;
};

export class GetAnalysisByIdUseCase {
	constructor(private analisysRequestRepository: AnalysisRequestRepository) {}

	async execute({
		analysisRequestId,
	}: GetAnalysisByIdUseCaseRequest): Promise<GetAnalysisByIdUseCaseResponse> {}
}
