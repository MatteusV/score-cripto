import { NextResponse } from "next/server"

// API routes rodam server-side: usa API_BASE_URL (nome do serviço Docker)
const PROCESS_DATA_IA_URL =
  process.env.API_BASE_URL ?? "http://localhost:3002"

export async function POST(request: Request) {
  const body = await request.json()
  const { chain, address } = body as { chain: string; address: string }

  if (!chain || !address) {
    return NextResponse.json(
      { error: "chain and address are required" },
      { status: 400 },
    )
  }

  // userId temporário até o serviço de autenticação existir
  const userId = "anonymous"

  try {
    const upstream = await fetch(`${PROCESS_DATA_IA_URL}/analysis`, {
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

    return NextResponse.json(
      { processId: data.requestId, status: data.status },
      { status: 202 },
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}
