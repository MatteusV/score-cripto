import type { AnalysisRequest } from "../../generated/prisma/client";
import { prisma } from "../../services/database";
import type {
	AnalysisRequestRepository,
	FindByIndexData,
	ListByUserResult,
} from "../analysis-request-repository";
export class AnalysisRequestiPrismaRepository
	implements AnalysisRequestRepository
{
	async countByUserThisMonth(userId: string): Promise<number> {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const analysisRequests = await prisma.analysisRequest.count({
			where: {
				userId,
				requestedAt: startOfMonth,
				status: "COMPLETED",
			},
		});

		return analysisRequests;
	}

	async create(
		data: Omit<AnalysisRequest, "id">,
	): Promise<AnalysisRequest | null> {
		const analysisRequest = await prisma.analysisRequest.create({
			data,
		});

		if (!analysisRequest) {
			return null;
		}

		return analysisRequest;
	}

	async findById(id: string): Promise<AnalysisRequest | null> {
		const analysisRequest = await prisma.analysisRequest.findUnique({
			where: {
				id,
			},
		});

		if (!analysisRequest) {
			return null;
		}

		return analysisRequest;
	}

	async findByIndex({
		address,
		chain,
		userId,
	}: FindByIndexData): Promise<AnalysisRequest | null> {
		const analysisRequest = await prisma.analysisRequest.findFirst({
			where: {
				chain,
				address,
				userId,
			},
		});

		if (!analysisRequest) {
			return null;
		}

		return analysisRequest;
	}

	async listByUserId(
		userId: string,
		page: number,
		limit: number,
	): Promise<ListByUserResult> {
		const skip = (page - 1) * limit;
		const analysisRequests = await prisma.analysisRequest.findMany({
			where: {
				userId,
			},
			skip,
			take: limit,
			orderBy: {
				requestedAt: "desc",
			},
		});

		return {
			items: analysisRequests,
			total: analysisRequests.length,
		};
	}

	async update(
		id: string,
		data: Partial<AnalysisRequest>,
	): Promise<AnalysisRequest | null> {
		const analysisRequestExists = await prisma.analysisRequest.findUnique({
			where: {
				id,
			},
		});

		if (!analysisRequestExists) {
			return null;
		}

		const analysisRequestUpdated = await prisma.analysisRequest.update({
			where: {
				id,
			},
			data,
		});

		return analysisRequestUpdated;
	}
}
