import { NextResponse } from "next/server"
import { createLogger } from "@/lib/logger"

const DATA_INDEXING_URL = process.env.DATA_INDEXING_URL ?? "http://localhost:4000"
const logger = createLogger("api/search")

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const upstream = new URL(`${DATA_INDEXING_URL}/api/search`)

  const forwarded = ["q", "page", "per_page", "chain", "min_score", "max_score", "sort_by", "sort_order"]
  for (const key of forwarded) {
    const value = searchParams.get(key)
    if (value !== null && value !== "") {
      upstream.searchParams.set(key, value)
    }
  }

  const riskFlags = searchParams.getAll("risk_flags")
  for (const flag of riskFlags) {
    upstream.searchParams.append("risk_flags[]", flag)
  }

  logger.info("proxying search request", { query: upstream.search })

  try {
    const res = await fetch(upstream.toString(), {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 },
    })

    const data = await res.json()

    if (!res.ok) {
      logger.warn("data-indexing returned non-2xx", { status: res.status })
    }

    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    logger.error("failed to proxy search", {}, err instanceof Error ? err : undefined)
    return NextResponse.json({ error: "Serviço de busca indisponível" }, { status: 503 })
  }
}
