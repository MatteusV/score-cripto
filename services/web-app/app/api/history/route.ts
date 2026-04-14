import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { fetchWithAuthJson } from "@/lib/fetch-with-auth"
import { createLogger } from "@/lib/logger"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
const logger = createLogger("api/history")

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("access-token")?.value

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page") ?? "1"
  const limit = searchParams.get("limit") ?? "20"

  logger.info("fetching analysis history", { page, limit })

  try {
    const { data, status, ok } = await fetchWithAuthJson(
      `${API_GATEWAY_URL}/analysis?page=${page}&limit=${limit}`,
      {},
    )

    if (!ok) {
      logger.warn("upstream returned non-2xx", { page, limit, status })
    }

    return NextResponse.json(data, { status: ok ? 200 : status })
  } catch (err) {
    logger.error("failed to fetch history", { page, limit }, err instanceof Error ? err : undefined)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 503 })
  }
}
