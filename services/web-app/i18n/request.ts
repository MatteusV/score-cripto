import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"

const VALID_LOCALES = ["pt-BR", "en", "es"] as const
export type Locale = (typeof VALID_LOCALES)[number]

export function isValidLocale(locale: string): locale is Locale {
  return (VALID_LOCALES as readonly string[]).includes(locale)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get("locale")?.value ?? "pt-BR"
  const locale: Locale = isValidLocale(raw) ? raw : "pt-BR"

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default as Record<string, unknown>,
  }
})
