import { NextResponse } from "next/server"

const processes = new Map<
  string,
  { chain: string; address: string; createdAt: number }
>()

export async function POST(request: Request) {
  const body = await request.json()
  const { chain, address } = body as { chain: string; address: string }

  if (!chain || !address) {
    return NextResponse.json(
      { error: "chain and address are required" },
      { status: 400 },
    )
  }

  const processId = `proc-${crypto.randomUUID().slice(0, 8)}`
  processes.set(processId, { chain, address, createdAt: Date.now() })

  return NextResponse.json({ processId })
}

export { processes }
