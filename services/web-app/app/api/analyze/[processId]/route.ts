import { NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { createLogger } from "@/lib/logger"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
const logger = createLogger("api/analyze/[processId]")

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ processId: string }> },
) {
  const { processId } = await params

  logger.info("polling analysis result", { processId })

  try {
    const upstream = await fetchWithAuth(`${API_GATEWAY_URL}/analysis/${processId}`, {})

    const data = await upstream.json()

    if (!upstream.ok) {
      logger.warn("upstream returned non-2xx", { processId, status: upstream.status, error: (data as { error?: string }).error })
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? "Upstream error" },
        { status: upstream.status },
      )
    }

    // Gateway retorna requestId; frontend espera processId — normalizar aqui
    const { requestId, ...rest } = data as { requestId?: string; [k: string]: unknown }
    return NextResponse.json({ ...rest, processId: requestId ?? rest.processId })
  } catch (err) {
    logger.error("failed to reach analysis service", { processId }, err instanceof Error ? err : undefined)
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}
