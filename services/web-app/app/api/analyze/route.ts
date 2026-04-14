import { NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { createLogger } from "@/lib/logger"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
const logger = createLogger("api/analyze")

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
