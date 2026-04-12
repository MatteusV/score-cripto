import Link from "next/link"
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BrainCircuitIcon,
  LayersIcon,
  RadarIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"
import { AuthHeader } from "@/components/auth-header"
import { WalletIntakeForm } from "@/components/wallet-intake-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Page() {
  const trustSignals = [
    {
      title: "Sinais on-chain",
      description:
        "Volume, idade, diversidade de contrapartes e uso de DeFi compõem a leitura base do score.",
      icon: RadarIcon,
      color: "text-chart-1",
      border: "border-chart-1/15",
      bg: "bg-chart-1/5",
    },
    {
      title: "Risco explicado",
      description:
        "Mixers, sanções e concentração exagerada aparecem como fatores de risco legíveis.",
      icon: ShieldAlertIcon,
      color: "text-chart-4",
      border: "border-chart-4/15",
      bg: "bg-chart-4/5",
    },
    {
      title: "Confiança auditável",
      description:
        "Score final com reasoning, positiveFactors e riskFactors vindos do pipeline de IA.",
      icon: BadgeCheckIcon,
      color: "text-chart-3",
      border: "border-chart-3/15",
      bg: "bg-chart-3/5",
    },
  ]

  const metrics = [
    { value: "0-100", label: "Score range", icon: ShieldCheckIcon },
    { value: "7", label: "Redes EVM", icon: LayersIcon },
    { value: "< 5s", label: "Tempo de análise", icon: ZapIcon },
    { value: "IA", label: "Score engine", icon: BrainCircuitIcon },
  ]

  return (
    <main className="flex min-h-svh flex-col">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="hero-aurora pointer-events-none absolute inset-0" />
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="hero-orb pointer-events-none absolute top-1/2 -right-32 hidden h-[520px] w-[520px] -translate-y-1/2 rounded-full md:block" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pt-8 pb-16 md:px-10 md:pt-12 lg:pt-16">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-border/50 bg-card/40 text-sm font-bold tracking-[0.2em] text-primary">
                SC
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Score Cripto
                </p>
                <p className="text-xs text-muted-foreground">
                  Confiança on-chain
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="cursor-pointer hidden md:flex"
              >
                <Link href="#como-funciona">Como funciona</Link>
              </Button>
              <AuthHeader />
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="animate-fade-up flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary"
                >
                  v0.1 — beta
                </Badge>
                <Badge
                  variant="outline"
                  className="border-accent/30 text-accent"
                >
                  Powered by IA
                </Badge>
              </div>

              <h1 className="animate-fade-up animate-fade-up-delay-1 text-4xl leading-tight font-bold tracking-tight text-balance text-foreground md:text-6xl md:leading-[1.05]">
                Confiança antes de cada transação.
              </h1>

              <p className="animate-fade-up animate-fade-up-delay-2 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                Cole um endereço, receba um score de 0 a 100 com explicação
                completa dos fatores que puxaram o risco para cima ou para
                baixo.
              </p>

              <div className="animate-fade-up animate-fade-up-delay-3 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="cursor-pointer px-5">
                  <Link href="#consultar">
                    <ArrowRightIcon data-icon="inline-end" />
                    Analisar carteira
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="cursor-pointer"
                >
                  <Link href="/analyze?chain=ethereum&address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045">
                    Ver exemplo real
                  </Link>
                </Button>
              </div>
            </div>

            <div className="animate-fade-up animate-fade-up-delay-4 relative">
              <div className="glass-panel scanline relative overflow-hidden rounded-3xl border border-border/40 p-6 shadow-[0_24px_80px_-56px_color-mix(in_srgb,var(--accent)_35%,transparent)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
                      Score Snapshot
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      83/100
                    </p>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                    <SparklesIcon className="size-5 text-primary" />
                  </div>
                </div>
                <div className="mt-6 grid gap-3 text-sm text-muted-foreground/80">
                  <div className="flex items-center justify-between">
                    <span>Consistência on-chain</span>
                    <span className="text-foreground/80">Alta</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Risco de sanção</span>
                    <span className="text-foreground/80">Baixo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Histórico DeFi</span>
                    <span className="text-foreground/80">Estável</span>
                  </div>
                </div>
                <div className="mt-6 h-px bg-border/30" />
                <p className="mt-4 text-xs text-muted-foreground/60">
                  Score recalculado continuamente com dados on-chain e IA
                  auditável.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics bar */}
      <section className="border-y border-border/20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4 md:px-10">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-card/40">
                <metric.icon className="size-4 text-primary/70" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-foreground">
                  {metric.value}
                </p>
                <p className="text-xs tracking-[0.25em] text-muted-foreground/60 uppercase">
                  {metric.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 md:px-10"
        id="como-funciona"
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
            Sinais-chave
          </p>
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
            O score nasce de sinais auditáveis.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cada análise combina sinais objetivos de rede com interpretação de
            IA para entregar um score que você consegue explicar e defender.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {trustSignals.map((signal) => (
              <div
                key={signal.title}
                className="group flex flex-col gap-3 border-b border-border/20 pb-6 last:border-none"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl ${signal.border} ${signal.bg}`}
                  >
                    <signal.icon className={`size-5 ${signal.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {signal.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-3xl border border-border/40 p-6">
            <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
              Pipeline IA
            </p>
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              Da cadeia para o score em segundos.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Dados on-chain normalizados, enriquecidos e enviados para o modelo
              com contexto estruturado. O resultado retorna com reasoning e
              metadados de confiança versionados.
            </p>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground/80">
              <div className="flex items-center justify-between">
                <span>Cache inteligente</span>
                <span className="text-foreground/80">20 min TTL</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fallback heurístico</span>
                <span className="text-foreground/80">Ativo</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auditoria completa</span>
                <span className="text-foreground/80">Versionada</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intake form */}
      <section
        id="consultar"
        className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 md:grid-cols-[1.1fr_0.9fr] md:px-10"
      >
        <Card className="glass-panel glow-line overflow-hidden">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Consulta
            </Badge>
            <CardTitle className="text-xl md:text-2xl">
              Iniciar análise
            </CardTitle>
            <CardDescription className="max-w-md">
              Selecione a rede e cole o endereço da carteira. O pipeline coleta
              dados on-chain e gera o score em segundos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletIntakeForm />
          </CardContent>
        </Card>

        <div className="flex flex-col justify-between gap-6">
          <div className="glass-panel rounded-3xl border border-border/40 p-6">
            <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
              Como funciona
            </p>
            <div className="mt-4 grid gap-4">
              {[
                {
                  step: "01",
                  text: "Dados on-chain coletados e normalizados pelo data-search",
                },
                {
                  step: "02",
                  text: "IA processa contexto e gera score com reasoning completo",
                },
                {
                  step: "03",
                  text: "Resultado persiste com fatores positivos e de risco auditáveis",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="font-heading text-xs font-bold text-primary/60">
                    {item.step}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/30 bg-card/20 p-6">
            <p className="text-xs tracking-[0.3em] text-muted-foreground/60 uppercase">
              Confiança contínua
            </p>
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              Recálculo automático quando sinais mudam.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              O score retorna imediatamente quando válido e agenda refresh em
              segundo plano para capturar mudanças relevantes de comportamento.
            </p>
            <Button asChild size="sm" className="mt-5 cursor-pointer">
              <Link href="/analyze?chain=ethereum&address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045">
                Ver relatório completo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 text-center">
        <p className="text-xs text-muted-foreground/60">
          Score Cripto — análise de confiabilidade on-chain com IA
        </p>
      </footer>
    </main>
  )
}
