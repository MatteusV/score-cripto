import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// API routes rodam server-side: usa API_BASE_URL (nome do serviço Docker)
const API_GATEWAY_URL =
  process.env.API_BASE_URL ?? "http://localhost:3001"

export async function POST(request: Request) {
  const body = await request.json()
  const { chain, address } = body as { chain: string; address: string }

  if (!chain || !address) {
    return NextResponse.json(
      { error: "chain and address are required" },
      { status: 400 },
    )
  }

  // Identidade anônima estável por sessão de browser — será substituída por auth real
  const cookieStore = await cookies()
  const existingSessionId = cookieStore.get("session-id")?.value
  const userId = existingSessionId ?? crypto.randomUUID()

  try {
    const upstream = await fetch(`${API_GATEWAY_URL}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain, address, userId }),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? "Upstream error" },
        { status: upstream.status },
      )
    }

    const response = NextResponse.json(
      { processId: data.requestId, status: data.status },
      { status: 202 },
    )

    if (!existingSessionId) {
      response.cookies.set("session-id", userId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    return response
  } catch {
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}
