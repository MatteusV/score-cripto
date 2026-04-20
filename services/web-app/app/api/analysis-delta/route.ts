import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchWithAuthJson } from "@/lib/fetch-with-auth"
import { createLogger } from "@/lib/logger"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
const logger = createLogger("api/analysis-delta")

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("access-token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = searchParams.get("days") ?? "3"

  logger.info("fetching analysis delta", { days })

  try {
    const { data, status, ok } = await fetchWithAuthJson(
      `${API_GATEWAY_URL}/analysis/delta?days=${encodeURIComponent(days)}`,
      {},
    )

    if (!ok) {
      logger.warn("upstream returned non-2xx", { days, status })
    }

    return NextResponse.json(data, { status: ok ? 200 : status })
  } catch (err) {
    logger.error(
      "failed to fetch analysis delta",
      { days },
      err instanceof Error ? err : undefined,
    )
    return NextResponse.json(
      { error: "Failed to fetch analysis delta" },
      { status: 503 },
    )
  }
}
