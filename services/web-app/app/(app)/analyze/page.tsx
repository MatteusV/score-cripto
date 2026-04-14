import { HistoricalResultShell } from "@/components/historical-result-shell"
import { ResultShell } from "@/components/result-shell"
import { Topbar } from "@/components/topbar"
import { parseAnalyzeSearchParams } from "@/lib/query"

interface AnalyzePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const params = parseAnalyzeSearchParams(await searchParams)

  return (
    <div className="flex flex-col">
      <Topbar title="Análise de carteira" subtitle="Score gerado por IA a partir de dados on-chain" />

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
        {params.mode === "history" ? (
          <HistoricalResultShell publicId={params.publicId} />
        ) : (
          <ResultShell chain={params.chain} address={params.address} />
        )}

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="font-heading text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              Checklist
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {[
                ["Coleta on-chain", "Em andamento"],
                ["Normalização", "Automática"],
                ["IA + reasoning", "Versionado"],
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
              O que observar
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Score alto indica confiança, mas verifique fatores de risco, mixers e
              concentração excessiva antes de decidir.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
