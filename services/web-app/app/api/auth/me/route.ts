import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const API_URL =
  process.env.API_GATEWAY_URL ??
  process.env.USERS_URL ??
  "http://localhost:3001"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("access-token")?.value

  if (!token) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })

    if (res.status === 401) {
      // Try to refresh
      const refreshToken = cookieStore.get("refresh-token")?.value
      if (!refreshToken) {
        return NextResponse.json({ error: "Sessão expirada" }, { status: 401 })
      }

      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })

      if (!refreshRes.ok) {
        cookieStore.delete("access-token")
        cookieStore.delete("refresh-token")
        return NextResponse.json({ error: "Sessão expirada" }, { status: 401 })
      }

      const refreshData = await refreshRes.json()
      cookieStore.set("access-token", refreshData.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 15,
        path: "/",
      })

      const retryRes = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${refreshData.accessToken}` },
        cache: "no-store",
      })
      const retryData = await retryRes.json()
      return NextResponse.json(retryData)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Serviço indisponível" },
      { status: 503 },
    )
  }
}
