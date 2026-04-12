import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const USERS_URL = process.env.USERS_URL ?? "http://localhost:3003"

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const upstream = await fetch(`${USERS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error ?? "Credenciais inválidas" },
        { status: upstream.status },
      )
    }

    const cookieStore = await cookies()
    cookieStore.set("access-token", data.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 15, // 15 min
      path: "/",
    })
    cookieStore.set("refresh-token", data.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return NextResponse.json({ user: data.user })
  } catch {
    return NextResponse.json(
      { error: "Serviço de autenticação indisponível" },
      { status: 503 },
    )
  }
}
