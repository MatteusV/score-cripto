export interface StartAnalysisRequest {
  address: string;
  chain: string;
}

export interface StartAnalysisResponse {
  processId: string;
}

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export interface ScoreResult {
  confidence: number;
  modelVersion: string;
  positiveFactors: string[];
  promptVersion: string;
  reasoning: string;
  riskFactors: string[];
  score: number;
}

export type AnalysisStage =
  | "detect"
  | "fetch"
  | "normalize"
  | "sanctions"
  | "mixer"
  | "ai"
  | "score";

export type AnalysisStageState = "started" | "completed" | "failed";

export interface AnalysisResponse {
  address: string;
  chain: string;
  currentStage?: AnalysisStage | null;
  error?: string;
  processId: string;
  publicId?: number | null;
  result?: ScoreResult;
  stageState?: AnalysisStageState | null;
  status: AnalysisStatus;
}

export interface CachedLookupResponse {
  address: string;
  chain: string;
  processId: string;
  publicId?: number | null;
  result?: ScoreResult;
  status: "pending" | "processing" | "completed";
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    // Same-origin hoje (API_BASE = "/api"), mas mantém credentials:'include'
    // para o caso de NEXT_PUBLIC_API_BASE apontar pro api-gateway diretamente
    // — combina com `credentials: true` na CORS do gateway.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json() as Promise<T>;
}

export function startAnalysis(
  payload: StartAnalysisRequest
): Promise<StartAnalysisResponse> {
  return request<StartAnalysisResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function pollAnalysis(processId: string): Promise<AnalysisResponse> {
  return request<AnalysisResponse>(`/analyze/${encodeURIComponent(processId)}`);
}

export async function lookupCachedAnalysis(
  chain: string,
  address: string
): Promise<CachedLookupResponse | null> {
  const params = new URLSearchParams({ chain, address });
  const url = `${API_BASE}/analyze?${params.toString()}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json() as Promise<CachedLookupResponse>;
}

export function getAnalysisByPublicId(
  publicId: number
): Promise<AnalysisResponse> {
  return request<AnalysisResponse>(`/analyze/p/${publicId}`);
}
