import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const API_URL =
  process.env.API_GATEWAY_URL ??
  process.env.USERS_URL ??
  "http://localhost:3001"

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const regData = await regRes.json()

    if (!regRes.ok) {
      return NextResponse.json(
        { error: regData.error ?? "Erro ao registrar" },
        { status: regRes.status },
      )
    }

    // Auto-login after register
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    })

    const loginData = await loginRes.json()

    if (loginRes.ok) {
      const cookieStore = await cookies()
      cookieStore.set("access-token", loginData.accessToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 15,
        path: "/",
      })
      cookieStore.set("refresh-token", loginData.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })
      return NextResponse.json({ user: loginData.user }, { status: 201 })
    }

    return NextResponse.json({ user: regData }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Serviço de autenticação indisponível" },
      { status: 503 },
    )
  }
}
