import { getTranslations } from "next-intl/server"
import { HistoricalResultShell } from "@/components/historical-result-shell"
import { ResultShell } from "@/components/result-shell"
import { Topbar } from "@/components/topbar"
import { parseAnalyzeSearchParams } from "@/lib/query"

interface AnalyzePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const params = parseAnalyzeSearchParams(await searchParams)
  const t = await getTranslations("analyze")

  return (
    <div className="flex flex-col">
      <Topbar title={t("pageTitle")} subtitle={t("pageSubtitle")} />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
        {params.mode === "history" ? (
          <HistoricalResultShell publicId={params.publicId} />
        ) : (
          <ResultShell chain={params.chain} address={params.address} />
        )}

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="font-heading text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {t("checklist.title")}
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {[
                [t("checklist.onchain"), t("checklist.onchainValue")],
                [t("checklist.normalization"), t("checklist.normalizationValue")],
                [t("checklist.ai"), t("checklist.aiValue")],
              ].map(([label, value]) => (
                <li key={label} className="flex items-center justify-between">
                  <span>{label}</span>
                  <span className="text-foreground/80">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/20 p-5">
            <p className="font-heading text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {t("observation.title")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("observation.body")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
