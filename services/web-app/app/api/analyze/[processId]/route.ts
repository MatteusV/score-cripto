import { NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/fetch-with-auth"

const API_GATEWAY_URL = process.env.API_BASE_URL ?? "http://localhost:3001"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ processId: string }> },
) {
  const { processId } = await params

  try {
    const upstream = await fetchWithAuth(`${API_GATEWAY_URL}/analysis/${processId}`, {})

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? "Upstream error" },
        { status: upstream.status },
      )
    }

    // Gateway retorna requestId; frontend espera processId — normalizar aqui
    const { requestId, ...rest } = data as { requestId?: string; [k: string]: unknown }
    return NextResponse.json({ ...rest, processId: requestId ?? rest.processId })
  } catch {
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}
