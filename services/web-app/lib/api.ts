export interface StartAnalysisRequest {
  chain: string
  address: string
}

export interface StartAnalysisResponse {
  processId: string
}

export type AnalysisStatus =
  | "pending"
  | "processing"
  | "completed"
  | "error"

export interface ScoreResult {
  score: number
  confidence: number
  reasoning: string
  positiveFactors: string[]
  riskFactors: string[]
  modelVersion: string
  promptVersion: string
}

export interface AnalysisResponse {
  status: AnalysisStatus
  processId: string
  chain: string
  address: string
  result?: ScoreResult
  error?: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new ApiError(body || res.statusText, res.status)
  }

  return res.json() as Promise<T>
}

export function startAnalysis(
  payload: StartAnalysisRequest,
): Promise<StartAnalysisResponse> {
  return request<StartAnalysisResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function pollAnalysis(processId: string): Promise<AnalysisResponse> {
  return request<AnalysisResponse>(`/analyze/${encodeURIComponent(processId)}`)
}
