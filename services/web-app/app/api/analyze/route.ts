import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { createLogger } from "@/lib/logger"
import { ensureTranslation } from "@/lib/ensure-translation"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
const logger = createLogger("api/analyze")

interface UpstreamResult {
  reasoning: string
  positiveFactors: string[]
  riskFactors: string[]
  [k: string]: unknown
}

async function applyTranslation(
  processId: string,
  result: UpstreamResult,
  locale: string
): Promise<UpstreamResult> {
  const translated = await ensureTranslation(processId, locale, {
    reasoning: result.reasoning,
    positiveFactors: result.positiveFactors,
    riskFactors: result.riskFactors,
  })
  if (!translated) return result
  return { ...result, ...translated }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const chain = url.searchParams.get("chain")
  const address = url.searchParams.get("address")

  if (!chain || !address) {
    return NextResponse.json(
      { error: "chain and address are required" },
      { status: 400 },
    )
  }

  logger.info("cache lookup requested", { chain, address })

  try {
    const params = new URLSearchParams({ chain, address })
    const upstream = await fetchWithAuth(
      `${API_GATEWAY_URL}/analysis/by-wallet?${params.toString()}`,
      {},
    )

    const data = await upstream.json()

    if (!upstream.ok) {
      logger.warn("upstream returned non-2xx", {
        chain,
        address,
        status: upstream.status,
        error: (data as { error?: string }).error,
      })
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? "Upstream error" },
        { status: upstream.status },
      )
    }

    const { requestId, ...rest } = data as { requestId?: string; [k: string]: unknown }
    const normalized = { ...rest, processId: requestId ?? rest.processId }

    // Apply lazy translation if analysis is completed and has result
    if (
      (normalized as { status?: string }).status === "completed" &&
      (normalized as { result?: UpstreamResult }).result
    ) {
      const cookieStore = await cookies()
      const locale = cookieStore.get("locale")?.value ?? "pt-BR"
      const pid = normalized.processId as string
      const translated = await applyTranslation(pid, (normalized as { result: UpstreamResult }).result, locale)
      logger.info("cache lookup result", { chain, address, status: normalized.status })
      return NextResponse.json({ ...normalized, result: translated })
    }

    logger.info("cache lookup result", { chain, address, status: (rest as { status?: string }).status })
    return NextResponse.json(normalized)
  } catch (err) {
    logger.error("failed to reach analysis service", { chain, address }, err instanceof Error ? err : undefined)
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { chain, address } = body as { chain: string; address: string }

  if (!chain || !address) {
    return NextResponse.json(
      { error: "chain and address are required" },
      { status: 400 },
    )
  }

  logger.info("analysis requested", { chain, address })

  try {
    const upstream = await fetchWithAuth(`${API_GATEWAY_URL}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain, address }),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      logger.warn("upstream returned non-2xx", { chain, address, status: upstream.status, error: data.error })
      return NextResponse.json(
        { error: data.error ?? "Upstream error" },
        { status: upstream.status },
      )
    }

    logger.info("analysis accepted", { chain, address, processId: data.requestId })
    return NextResponse.json(
      { processId: data.requestId, status: data.status },
      { status: 202 },
    )
  } catch (err) {
    logger.error("failed to reach analysis service", { chain, address }, err instanceof Error ? err : undefined)
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}
