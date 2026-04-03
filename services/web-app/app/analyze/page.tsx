import { ResultShell } from "@/components/result-shell"
import { ThemeToggle } from "@/components/theme-toggle"
import { parseAnalyzeSearchParams } from "@/lib/query"

interface AnalyzePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const params = parseAnalyzeSearchParams(await searchParams)

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-border/20 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
              Análise
            </p>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              Análise de carteira
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Acompanhe o score gerado por IA, os fatores positivos e os sinais
              de risco detectados no endereço analisado.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border/30 bg-card/50 px-4 py-3 text-xs text-muted-foreground/70">
              Atualizado em tempo real durante a execução.
            </div>
            <ThemeToggle />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <ResultShell chain={params.chain} address={params.address} />
        </div>
        <aside className="flex flex-col gap-4">
          <div className="glass-panel rounded-2xl border border-border/40 p-5">
            <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
              Checklist
            </p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground/80">
              <li className="flex items-center justify-between">
                <span>Coleta on-chain</span>
                <span className="text-foreground/80">Em andamento</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Normalização</span>
                <span className="text-foreground/80">Automática</span>
              </li>
              <li className="flex items-center justify-between">
                <span>IA + reasoning</span>
                <span className="text-foreground/80">Versionado</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/20 p-5">
            <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
              O que observar
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Score alto indica confiança, mas verifique sempre fatores de
              risco, mixers e concentração excessiva antes de decidir.
            </p>
          </div>
        </aside>
      </section>
    </main>
  )
}
