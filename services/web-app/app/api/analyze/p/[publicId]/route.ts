import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { createLogger } from "@/lib/logger"
import { ensureTranslation } from "@/lib/ensure-translation"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
const logger = createLogger("api/analyze/p/[publicId]")

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params

  logger.info("historical analysis requested", { publicId })

  try {
    const upstream = await fetchWithAuth(
      `${API_GATEWAY_URL}/analysis/p/${publicId}`,
      {},
    )

    const data = await upstream.json()

    if (!upstream.ok) {
      logger.warn("upstream returned non-2xx", {
        publicId,
        status: upstream.status,
        error: (data as { error?: string }).error,
      })
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? "Upstream error" },
        { status: upstream.status },
      )
    }

    const { requestId, ...rest } = data as { requestId?: string; [k: string]: unknown }
    const normalized: Record<string, unknown> = { ...rest, processId: requestId ?? rest.processId }

    // Apply lazy translation when completed
    if (
      (normalized as { status?: string }).status === "completed" &&
      (normalized as { result?: { reasoning: string; positiveFactors: string[]; riskFactors: string[] } }).result
    ) {
      const cookieStore = await cookies()
      const locale = cookieStore.get("locale")?.value ?? "pt-BR"
      const pid = normalized.processId as string
      const result = (normalized as { result: { reasoning: string; positiveFactors: string[]; riskFactors: string[] } }).result
      const translated = await ensureTranslation(pid, locale, result)
      logger.info("historical analysis result translated", { publicId, locale })
      return NextResponse.json({ ...normalized, result: translated ? { ...result, ...translated } : result })
    }

    return NextResponse.json({ ...normalized })
  } catch (err) {
    logger.error(
      "failed to reach analysis service",
      { publicId },
      err instanceof Error ? err : undefined,
    )
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}
