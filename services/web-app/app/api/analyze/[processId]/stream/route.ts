import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { createLogger } from "@/lib/logger"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
const logger = createLogger("api/analyze/[processId]/stream")

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ processId: string }> },
) {
  const { processId } = await params

  logger.info("opening SSE stream", { processId })

  try {
    const upstream = await fetchWithAuth(
      `${API_GATEWAY_URL}/analysis/${processId}/stream`,
      {
        headers: { Accept: "text/event-stream" },
        signal: request.signal,
      },
    )

    if (!upstream.ok) {
      const data = await upstream.json() as { error?: string }
      return new Response(
        JSON.stringify({ error: data.error ?? "Upstream error" }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } },
      )
    }

    // Proxy direto do stream — mantém a conexão SSE até o upstream fechar
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      return new Response(null, { status: 499 })
    }

    logger.error("failed to open SSE stream", { processId }, err instanceof Error ? err : undefined)
    return new Response(
      JSON.stringify({ error: "Failed to reach analysis service" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    )
  }
}
