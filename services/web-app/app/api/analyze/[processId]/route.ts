import { NextResponse } from "next/server"

const PROCESS_DATA_IA_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ processId: string }> },
) {
  const { processId } = await params

  try {
    const upstream = await fetch(`${PROCESS_DATA_IA_URL}/analysis/${processId}`)

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? "Upstream error" },
        { status: upstream.status },
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Failed to reach analysis service" },
      { status: 503 },
    )
  }
}
