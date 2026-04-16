"use client"

import Link from "next/link"
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BrainCircuitIcon,
  CopyIcon,
  RefreshCwIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { useWalletScore } from "@/hooks/use-wallet-score"
import { AnalysisLoader } from "@/components/analysis-loader"
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

interface ResultShellProps {
  chain: string
  address: string
}

function truncateAddress(addr: string) {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

export function ResultShell({ chain, address }: ResultShellProps) {
  const { phase, result, error, backendStatus, fromCache, submit, reset } = useWalletScore(chain, address)
  const t = useTranslations("analyze")

  useEffect(() => {
    if (chain && address) {
      submit()
    }
  }, [chain, address, submit])

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="cursor-pointer">
            <Link href="/">
              <ArrowLeftIcon data-icon="inline-start" />
              {t("back")}
            </Link>
          </Button>
          <div className="hidden h-5 w-px bg-border/50 sm:block" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/20 font-mono text-xs">
              {chain}
            </Badge>
            <Badge variant="secondary" className="text-[0.6rem] tracking-[0.2em] uppercase">
              Score Cripto
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <QuickActions chain={chain} address={address} />
          {phase === "completed" && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                reset()
                submit({ force: true })
              }}
            >
              <RefreshCwIcon data-icon="inline-start" />
              {t("recalculate")}
            </Button>
          )}
        </div>
      </div>

      {/* Address bar */}
      <div className="animate-fade-up animate-fade-up-delay-1 flex flex-col gap-3 rounded-2xl border border-border/30 bg-card/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-[0.6rem] tracking-[0.2em] text-muted-foreground/60 uppercase">
            {t("walletAnalyzed")}
          </p>
          <p className="mt-1 truncate font-mono text-sm text-foreground/90">
            {address || t("noAddress")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-border/40 text-[0.65rem] tracking-[0.2em] uppercase">
            {phase === "completed"
              ? t("status.completed")
              : phase === "error"
                ? t("status.error")
                : t("status.processing")}
          </Badge>
          {fromCache && phase === "completed" && (
            <Badge
              variant="secondary"
              className="border-accent/20 text-[0.65rem] tracking-[0.2em] uppercase text-accent"
            >
              {t("badges.cached")}
            </Badge>
          )}
          {address && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 cursor-pointer"
              onClick={() => navigator.clipboard.writeText(address)}
              aria-label={t("back")}
            >
              <CopyIcon />
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      {(phase === "submitting" || phase === "polling") && (
        <Card className="glass-panel animate-fade-up animate-fade-up-delay-2">
          <CardContent>
            <AnalysisLoader backendStatus={backendStatus} />
          </CardContent>
        </Card>
      )}

      {phase === "error" && (
        <Card className="animate-fade-up animate-fade-up-delay-2 border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-5 py-12">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircleIcon className="size-7 text-destructive" />
            </div>
            <div className="max-w-sm space-y-1 text-center">
              <p className="font-heading text-sm font-medium">{t("error.title")}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" className="cursor-pointer" onClick={() => void submit()}>
              <RefreshCwIcon data-icon="inline-start" />
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "idle" && (
        <Card className="glass-panel animate-fade-up animate-fade-up-delay-2">
          <CardContent className="flex flex-col items-center gap-5 py-12">
            <p className="text-sm text-muted-foreground">{t("readyToStart")}</p>
            <Button className="cursor-pointer" onClick={() => void submit()}>
              {t("startAnalysis")}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "completed" && result && (
        <>
          {/* Score + Reasoning */}
          <div className="animate-fade-up animate-fade-up-delay-2 grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="glass-panel glow-line overflow-hidden">
              <CardContent className="flex items-center justify-center p-4">
                <ScoreGauge score={result.score} confidence={result.confidence} />
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BrainCircuitIcon className="size-4 text-accent" />
                  <CardTitle className="text-xs">{t("reasoning.title")}</CardTitle>
                </div>
                <CardDescription className="sr-only">
                  {t("reasoning.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-foreground/85">{result.reasoning}</p>
              </CardContent>
              <CardFooter className="gap-4 text-[0.65rem] text-muted-foreground">
                <span className="font-mono">model: {result.modelVersion}</span>
                <span className="font-mono">prompt: {result.promptVersion}</span>
              </CardFooter>
            </Card>
          </div>

          {/* Factors */}
          <Card className="animate-fade-up animate-fade-up-delay-3 glass-panel">
            <CardHeader>
              <CardTitle className="text-xs">{t("factors.title")}</CardTitle>
              <CardDescription>{t("factors.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreFactors
                positiveFactors={result.positiveFactors}
                riskFactors={result.riskFactors}
              />
            </CardContent>
          </Card>

          {/* Meta */}
          <div className="animate-fade-up animate-fade-up-delay-4 grid gap-4 md:grid-cols-3">
            {[
              { label: t("meta.score"), value: `${result.score}/100` },
              { label: t("meta.confidence"), value: `${Math.round(result.confidence * 100)}%` },
              { label: t("meta.address"), value: truncateAddress(address) },
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
        </>
      )}
    </div>
  )
}
