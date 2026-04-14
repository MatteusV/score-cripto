import { NextResponse } from "next/server"
import { createLogger } from "@/lib/logger"

const logger = createLogger("api/preferences/locale")
const VALID_LOCALES = ["pt-BR", "en", "es"]

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { locale?: string }
    const { locale } = body

    if (!locale || !VALID_LOCALES.includes(locale)) {
      logger.warn({ locale }, "Invalid locale requested")
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
    }

    logger.info({ locale }, "Locale preference updated")

    const res = NextResponse.json({ locale })
    res.cookies.set("locale", locale, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    })
    return res
  } catch (err) {
    logger.error({ err }, "Failed to update locale preference")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
