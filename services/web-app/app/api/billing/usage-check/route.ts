import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const USERS_URL = process.env.USERS_URL ?? "http://localhost:3003"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get("access-token")?.value

  // Unauthenticated users are not rate-limited here — gateway handles it
  if (!token) return NextResponse.json({ allowed: true })

  try {
    const res = await fetch(`${USERS_URL}/usage/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      // userId is extracted from JWT server-side by the users service
      body: JSON.stringify({ userId: "from-token" }),
      cache: "no-store",
    })

    if (res.status === 429) {
      const data = await res.json() as { retryAt?: string }
      return NextResponse.json(
        { error: "Limite mensal atingido", retryAt: data.retryAt },
        { status: 429 },
      )
    }

    return NextResponse.json({ allowed: true })
  } catch {
    // Fail open — let the analysis request itself return 429 if needed
    return NextResponse.json({ allowed: true })
  }
}
