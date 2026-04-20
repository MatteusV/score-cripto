import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api/preferences/locale");
const VALID_LOCALES = ["pt-BR", "en", "es"];

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      locale?: string;
    };
    const { locale } = body;

    if (!(locale && VALID_LOCALES.includes(locale))) {
      logger.warn("Invalid locale requested", { locale });
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    logger.info("Locale preference updated", { locale });

    const res = NextResponse.json({ locale });
    res.cookies.set("locale", locale, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    logger.error("Failed to update locale preference", { err });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
