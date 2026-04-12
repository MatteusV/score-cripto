import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const USERS_URL = process.env.USERS_URL ?? "http://localhost:3003"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("access-token")?.value
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  try {
    const res = await fetch(`${USERS_URL}/billing/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Serviço indisponível" }, { status: 503 })
  }
}
