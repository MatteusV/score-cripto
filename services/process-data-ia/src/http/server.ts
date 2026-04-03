import { createHash } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { z } from "zod";
import { publishWalletDataRequested } from "../events/publisher.js";
import { AnalysisRequestPrismaRepository } from "../repositories/prisma/analysis-request-prisma-repository.js";
import { ProcessedDataPrismaRepository } from "../repositories/prisma/processed-data-prisma-repository.js";
import { prisma } from "../services/database.js";
import { CreateAnalysisRequestUseCase } from "../use-cases/analysis-request/create-analysis-request-use-case.js";
import { AnalysisRequestAlreadyExistsError } from "../use-cases/errors/analysis-request-already-exists-error.js";

const PostAnalysisBodySchema = z.object({
  chain: z.string().min(1),
  address: z.string().min(1),
  userId: z.string().min(1),
});

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function handlePostAnalysis(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const raw = await readBody(req);
  const parsed = PostAnalysisBodySchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    json(res, 400, {
      error: "Invalid body",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { chain, address, userId } = parsed.data;

  // Hash preliminar baseado em chain+address — suficiente para deduplicação inicial
  const walletContextHash = createHash("sha256")
    .update(`${chain}:${address}`)
    .digest("hex");

  const repo = new AnalysisRequestPrismaRepository(prisma);
  const useCase = new CreateAnalysisRequestUseCase(repo);

  try {
    const { analysisRequest } = await useCase.execute({
      chain,
      address,
      userId,
      walletContextHash,
    });

    // Dispara o fluxo publicando o evento para o data-search
    console.log(`EMITINDO: wallet.data.requested | requestId=${analysisRequest.id} chain=${chain} address=${address}`);
    publishWalletDataRequested({
      requestId: analysisRequest.id,
      userId,
      chain,
      address,
    });

    json(res, 202, {
      requestId: analysisRequest.id,
      status: analysisRequest.status,
    });
  } catch (error) {
    if (error instanceof AnalysisRequestAlreadyExistsError) {
      // Busca o request existente para retornar o requestId
      const existing = await repo.findByIndex({ chain, address, userId });
      if (existing) {
        json(res, 200, { requestId: existing.id, status: existing.status });
        return;
      }
    }
    console.error("[HTTP] POST /analysis error:", (error as Error).message);
    json(res, 500, { error: "Internal server error" });
  }
}

async function handleGetAnalysis(
  _req: IncomingMessage,
  res: ServerResponse,
  requestId: string
): Promise<void> {
  const analysisRepo = new AnalysisRequestPrismaRepository(prisma);
  const processedDataRepo = new ProcessedDataPrismaRepository(prisma);

  const analysisRequest = await analysisRepo.findById(requestId);

  if (!analysisRequest) {
    json(res, 404, { error: "Analysis request not found" });
    return;
  }

  const status = analysisRequest.status.toLowerCase() as
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  const base = {
    requestId: analysisRequest.id,
    status,
    chain: analysisRequest.chain,
    address: analysisRequest.address,
  };

  if (analysisRequest.status !== "COMPLETED") {
    json(res, 200, base);
    return;
  }

  const processedData =
    await processedDataRepo.findByAnalysisRequestId(requestId);

  if (!processedData) {
    json(res, 200, base);
    return;
  }

  json(res, 200, {
    ...base,
    result: {
      score: processedData.score,
      confidence: processedData.confidence,
      reasoning: processedData.reasoning,
      positiveFactors: processedData.positiveFactors,
      riskFactors: processedData.riskFactors,
      modelVersion: processedData.modelVersion,
      promptVersion: processedData.promptVersion,
    },
  });
}

export function createHttpServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;

    try {
      if (req.method === "POST" && pathname === "/analysis") {
        await handlePostAnalysis(req, res);
        return;
      }

      const matchGet = pathname.match(/^\/analysis\/([^/]+)$/);
      if (req.method === "GET" && matchGet) {
        await handleGetAnalysis(req, res, matchGet[1]);
        return;
      }

      if (req.method === "GET" && pathname === "/health") {
        json(res, 200, { status: "ok" });
        return;
      }

      json(res, 404, { error: "Not found" });
    } catch (error) {
      console.error("[HTTP] Unhandled error:", (error as Error).message);
      json(res, 500, { error: "Internal server error" });
    }
  });
}
