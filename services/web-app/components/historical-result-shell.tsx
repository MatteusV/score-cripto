"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BrainCircuitIcon,
  CopyIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react"
import { useHistoricalAnalysis } from "@/hooks/use-historical-analysis"
import { QuickActions } from "@/components/quick-actions"
import { ScoreGauge } from "@/components/score-gauge"
import { ScoreFactors } from "@/components/score-factors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface HistoricalResultShellProps {
  publicId: number
}

function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

export function HistoricalResultShell({ publicId }: HistoricalResultShellProps) {
  const { phase, result, chain, address, error } = useHistoricalAnalysis(publicId)
  const router = useRouter()

  function handleRecalculate() {
    if (chain && address) {
      router.push(`/analyze?chain=${chain}&address=${address}`)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="cursor-pointer">
            <Link href="/">
              <ArrowLeftIcon data-icon="inline-start" />
              Voltar
            </Link>
          </Button>
          <div className="hidden h-5 w-px bg-border/50 sm:block" />
          <div className="flex items-center gap-2">
            {chain && (
              <Badge
                variant="outline"
                className="border-primary/20 font-mono text-xs"
              >
                {chain}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="text-[0.6rem] tracking-[0.2em] uppercase"
            >
              Análise #{publicId}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chain && address && <QuickActions chain={chain} address={address} />}
          {phase === "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={handleRecalculate}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Recalcular
            </Button>
          )}
        </div>
      </div>

      {/* Address bar */}
      {address && (
        <div className="animate-fade-up animate-fade-up-delay-1 flex flex-col gap-3 rounded-2xl border border-border/30 bg-card/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-[0.6rem] tracking-[0.2em] text-muted-foreground/60 uppercase">
              Carteira analisada
            </p>
            <p className="mt-1 truncate font-mono text-sm text-foreground/90">
              {address}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-border/40 text-[0.65rem] tracking-[0.2em] uppercase"
            >
              {phase === "completed" ? "Histórico" : phase === "error" ? "Erro" : "Carregando"}
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 cursor-pointer"
              onClick={() => navigator.clipboard.writeText(address)}
              aria-label="Copiar endereço"
            >
              <CopyIcon />
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === "loading" && (
        <Card className="glass-panel animate-fade-up animate-fade-up-delay-2">
          <CardContent className="flex flex-col items-center gap-5 py-12">
            <Loader2Icon className="size-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">Carregando análise histórica...</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {phase === "error" && (
        <Card className="animate-fade-up animate-fade-up-delay-2 border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-5 py-12">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircleIcon className="size-7 text-destructive" />
            </div>
            <div className="max-w-sm space-y-1 text-center">
              <p className="font-heading text-sm font-medium">Análise não encontrada</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {phase === "completed" && result && (
        <>
          {/* Score + Reasoning */}
          <div className="animate-fade-up animate-fade-up-delay-2 grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="glass-panel glow-line overflow-hidden">
              <CardContent className="flex items-center justify-center p-4">
                <ScoreGauge
                  score={result.score}
                  confidence={result.confidence}
                />
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BrainCircuitIcon className="size-4 text-accent" />
                  <CardTitle className="text-xs">Reasoning</CardTitle>
                </div>
                <CardDescription className="sr-only">
                  Explicação da IA sobre o score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-foreground/85">
                  {result.reasoning}
                </p>
              </CardContent>
              <CardFooter className="gap-4 text-[0.65rem] text-muted-foreground">
                <span className="font-mono">model: {result.modelVersion}</span>
                <span className="font-mono">
                  prompt: {result.promptVersion}
                </span>
              </CardFooter>
            </Card>
          </div>

          {/* Factors */}
          <Card className="animate-fade-up animate-fade-up-delay-3 glass-panel">
            <CardHeader>
              <CardTitle className="text-xs">Fatores da análise</CardTitle>
              <CardDescription>
                Sinais positivos e de risco detectados pelo pipeline de IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreFactors
                positiveFactors={result.positiveFactors}
                riskFactors={result.riskFactors}
              />
            </CardContent>
          </Card>

          {/* Meta */}
          {address && (
            <div className="animate-fade-up animate-fade-up-delay-4 grid gap-4 md:grid-cols-3">
              {[
                { label: "Score", value: `${result.score}/100` },
                {
                  label: "Confiança",
                  value: `${Math.round(result.confidence * 100)}%`,
                },
                { label: "Endereço", value: truncateAddress(address) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border/30 bg-card/30 px-4 py-3"
                >
                  <p className="font-heading text-[0.55rem] tracking-[0.2em] text-muted-foreground/50 uppercase">
                    {item.label}
                  </p>
                  <p className="mt-1 font-mono text-sm font-medium text-foreground/80">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
