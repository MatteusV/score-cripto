import Link from "next/link"
import {
  ArrowRightIcon,
  BrainCircuitIcon,
  ClockIcon,
  LayersIcon,
  RadarIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ZapIcon,
} from "lucide-react"
import { AuthHeader } from "@/components/auth-header"
import { WalletIntakeForm } from "@/components/wallet-intake-form"
import { ScoreRing } from "@/components/score-ring"
import { PlanCard } from "@/components/plan-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const STATS = [
  { value: "2.4M+",  label: "Carteiras analisadas" },
  { value: "99.2%",  label: "Precisão do score"    },
  { value: "<3s",    label: "Tempo de resposta"    },
  { value: "6",      label: "Blockchains suportadas"},
]

const STEPS = [
  {
    n: "01",
    icon: SearchIcon,
    title: "Informe o endereço",
    desc:  "Cole qualquer endereço de carteira: Ethereum, Bitcoin, Polygon, Solana e mais. Nosso sistema identifica automaticamente a rede.",
  },
  {
    n: "02",
    icon: BrainCircuitIcon,
    title: "IA analisa os dados",
    desc:  "Coletamos histórico de transações, interações com mixers, padrões suspeitos, age da carteira e dezenas de outros sinais.",
  },
  {
    n: "03",
    icon: ShieldCheckIcon,
    title: "Receba o score",
    desc:  "Score de 0 a 100 com explicação detalhada: fatores positivos, riscos identificados e confiança da análise.",
  },
]

const SIGNALS = [
  {
    icon: RadarIcon,
    title: "Sinais on-chain",
    desc:  "Volume, idade, diversidade de contrapartes e uso de DeFi compõem a leitura base do score.",
    color: "text-primary",
    bg:    "bg-primary/10",
  },
  {
    icon: ShieldAlertIcon,
    title: "Risco explicado",
    desc:  "Mixers, sanções e concentração exagerada aparecem como fatores de risco legíveis.",
    color: "text-destructive",
    bg:    "bg-destructive/10",
  },
  {
    icon: BrainCircuitIcon,
    title: "Confiança auditável",
    desc:  "Score final com reasoning, positiveFactors e riskFactors vindos do pipeline de IA.",
    color: "text-accent",
    bg:    "bg-accent/10",
  },
  {
    icon: ZapIcon,
    title: "Resposta rápida",
    desc:  "Cache inteligente de 20 min retorna scores válidos imediatamente, recalculando em segundo plano.",
    color: "text-green-400",
    bg:    "bg-green-400/10",
  },
]

const FREE_FEATURES = [
  { label: "5 análises por mês",          included: true  },
  { label: "Score completo 0-100",         included: true  },
  { label: "Fatores positivos e de risco", included: true  },
  { label: "Redes EVM principais",         included: true  },
  { label: "Cache prioritário",            included: false },
  { label: "Histórico de análises",        included: false },
]

const PRO_FEATURES = [
  { label: "15 análises por mês",          included: true },
  { label: "Score completo 0-100",         included: true },
  { label: "Fatores positivos e de risco", included: true },
  { label: "Todas as redes suportadas",    included: true },
  { label: "Cache prioritário",            included: true },
  { label: "Histórico de análises",        included: true },
]

export default function Page() {
  return (
    <main className="flex min-h-svh flex-col">
      {/* ─── NAV ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <ShieldIcon className="size-4 text-primary" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-sm font-bold tracking-widest text-foreground">
              Score<span className="text-primary">Cripto</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden cursor-pointer md:flex">
              <Link href="#como-funciona">Como funciona</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden cursor-pointer md:flex">
              <Link href="#pricing">Preços</Link>
            </Button>
            <AuthHeader />
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="hero-aurora pointer-events-none absolute inset-0" />
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="hero-orb pointer-events-none absolute top-1/2 -right-32 hidden h-[520px] w-[520px] -translate-y-1/2 rounded-full md:block" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20 text-center md:px-10 md:py-28">
          <div className="animate-fade-up flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              v0.1 — beta
            </Badge>
            <Badge variant="outline" className="border-accent/30 text-accent">
              Powered by IA
            </Badge>
          </div>

          <h1 className="animate-fade-up animate-fade-up-delay-1 mx-auto max-w-3xl text-4xl leading-[1.1] font-bold tracking-tight text-balance md:text-6xl md:leading-[1.05]">
            Confie com{" "}
            <span className="glow-gold text-primary">inteligência</span>.{" "}
            Transacione com{" "}
            <span className="text-accent">segurança</span>.
          </h1>

          <p className="animate-fade-up animate-fade-up-delay-2 mx-auto max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Cole um endereço, receba um score de 0 a 100 com explicação
            completa dos fatores que puxaram o risco para cima ou para baixo.
          </p>

          <div className="animate-fade-up animate-fade-up-delay-3 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="cursor-pointer gap-2 px-6">
              <Link href="/dashboard">
                <ArrowRightIcon className="size-4" />
                Começar grátis
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="cursor-pointer">
              <Link href="/analyze?chain=ethereum&address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045">
                Ver exemplo real
              </Link>
            </Button>
          </div>

          {/* Hero meta */}
          <div className="animate-fade-up animate-fade-up-delay-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            {[
              { icon: ShieldCheckIcon, text: "Score 0-100" },
              { icon: LayersIcon,      text: "6 redes EVM"  },
              { icon: ClockIcon,       text: "< 3s de análise" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="size-3.5 text-primary/60" strokeWidth={1.75} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ───────────────────────────────────────────────── */}
      <section className="border-y border-border/30">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4 md:px-10">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 text-center">
              <span className="font-heading text-2xl font-bold text-primary">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────── */}
      <section
        id="como-funciona"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 md:px-10"
      >
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
            Como funciona
          </p>
          <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
            Da carteira ao score em 3 passos
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Nossa IA coleta dados on-chain em tempo real e transforma em um score objetivo de confiabilidade.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="glass-panel relative overflow-hidden rounded-2xl border p-6"
            >
              <span className="font-heading text-5xl font-bold text-primary/10 select-none">
                {step.n}
              </span>
              <div className="mt-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <step.icon className="size-5 text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 font-heading text-sm font-bold tracking-wider">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DEMO ────────────────────────────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 md:grid-cols-2 md:items-center md:px-10">
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">
            Score em ação
          </p>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            Veja como o resultado aparece
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Um score claro com contexto detalhado para você tomar decisões com
            confiança. Reasoning da IA, fatores positivos e riscos identificados.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SIGNALS.map((s) => (
              <div key={s.title} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`size-4 ${s.color}`} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo card */}
        <div className="glass-panel scanline rounded-3xl border p-6 shadow-[0_24px_80px_-56px_oklch(0.59_0.22_295/35%)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">0x742d...f4e2</p>
              <Badge variant="outline" className="mt-1.5 border-primary/20 font-mono text-[10px]">
                ethereum
              </Badge>
            </div>
            <Badge variant="secondary" className="text-[10px]">Confiável</Badge>
          </div>

          <div className="mt-6 flex items-center gap-6">
            <ScoreRing score={80} size={100} confidence={0.92} />
            <div className="space-y-3 flex-1">
              {[
                { label: "Histórico on-chain", value: "+24 pts" },
                { label: "Diversidade DeFi",   value: "+18 pts" },
                { label: "Mixer detectado",    value: "-12 pts" },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span
                    className={
                      f.value.startsWith("+") ? "text-primary font-semibold" : "text-destructive font-semibold"
                    }
                  >
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground/60">
            Score recalculado com dados on-chain e IA auditável.
          </div>
        </div>
      </section>

      {/* ─── INTAKE FORM ─────────────────────────────────────────────── */}
      <section
        id="consultar"
        className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 md:grid-cols-[1.1fr_0.9fr] md:px-10"
      >
        <Card className="glass-panel glow-line overflow-hidden">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Consulta</Badge>
            <CardTitle className="text-xl md:text-2xl">Iniciar análise</CardTitle>
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
          <div className="glass-panel rounded-3xl border border-border p-6">
            <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
              Como funciona
            </p>
            <div className="mt-4 grid gap-4">
              {[
                { step: "01", text: "Dados on-chain coletados e normalizados pelo data-search" },
                { step: "02", text: "IA processa contexto e gera score com reasoning completo" },
                { step: "03", text: "Resultado persiste com fatores positivos e de risco auditáveis" },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="font-heading text-xs font-bold text-primary/60">{item.step}</span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/30 bg-card/20 p-6">
            <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
              Recálculo automático
            </p>
            <h3 className="mt-3 text-lg font-semibold text-foreground">
              Score atualizado quando sinais mudam.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Cache de 20 min retorna imediatamente e agenda refresh em segundo
              plano para capturar mudanças de comportamento.
            </p>
            <Button asChild size="sm" className="mt-5 cursor-pointer">
              <Link href="/analyze?chain=ethereum&address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045">
                Ver relatório completo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 md:px-10"
      >
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-muted-foreground uppercase">Planos</p>
          <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
            Comece grátis, escale conforme precisar
          </h2>
        </div>

        <div className="mx-auto grid w-full max-w-2xl gap-5 sm:grid-cols-2">
          <PlanCard
            name="Free"
            price="R$0"
            period="/mês"
            description="Para explorar a plataforma e análises pontuais."
            features={FREE_FEATURES}
            ctaLabel="Começar grátis"
            ctaHref="/register"
          />
          <PlanCard
            name="Pro"
            price="R$29,90"
            period="/mês"
            description="Para uso profissional com mais análises e todos os recursos."
            features={PRO_FEATURES}
            featured
            ctaLabel="Assinar Pro"
            ctaHref="/register"
          />
        </div>
      </section>

      {/* ─── CTA BANNER ──────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-10">
        <div className="glass-panel glow-line relative overflow-hidden rounded-3xl border px-8 py-12 text-center">
          <div className="hero-aurora absolute inset-0 opacity-40" />
          <div className="relative">
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              Pronto para analisar sua primeira carteira?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Gratuito para começar. Sem cartão de crédito. Score completo em segundos.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="cursor-pointer gap-2">
                <Link href="/register">
                  <ArrowRightIcon className="size-4" />
                  Criar conta grátis
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="cursor-pointer">
                <Link href="#consultar">Analisar sem conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border/20 py-8 text-center">
        <p className="text-xs text-muted-foreground/50">
          Score Cripto — análise de confiabilidade on-chain com IA
        </p>
      </footer>
    </main>
  )
}
