"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { GlobeIcon } from "lucide-react"

const LOCALES = [
  { value: "pt-BR", flag: "🇧🇷", short: "PT" },
  { value: "en",    flag: "🇺🇸", short: "EN" },
  { value: "es",    flag: "🇪🇸", short: "ES" },
] as const

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("locale")
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSelect(value: string) {
    if (value === locale || pending) return
    setPending(true)
    setOpen(false)
    await fetch("/api/preferences/locale", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: value }),
    })
    router.refresh()
    setPending(false)
  }

  const current = LOCALES.find((l) => l.value === locale)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label={t("label")}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/15 hover:text-foreground disabled:opacity-50"
      >
        <GlobeIcon className="size-3.5" strokeWidth={1.75} />
        <span>{current?.short ?? locale}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[110px] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {LOCALES.map((l) => (
              <button
                key={l.value}
                onClick={() => void handleSelect(l.value)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/5 ${
                  l.value === locale ? "text-primary" : "text-foreground/80"
                }`}
              >
                <span>{l.flag}</span>
                <span>{t(l.value as "pt-BR" | "en" | "es")}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
