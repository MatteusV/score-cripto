"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BrainCircuitIcon,
  CopyIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QuickActions } from "@/components/quick-actions";
import { ScoreFactors } from "@/components/score-factors";
import { ScoreGauge } from "@/components/score-gauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHistoricalAnalysis } from "@/hooks/use-historical-analysis";

interface HistoricalResultShellProps {
  publicId: number;
}

function truncateAddress(addr: string) {
  if (addr.length <= 14) {
    return addr;
  }
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export function HistoricalResultShell({
  publicId,
}: HistoricalResultShellProps) {
  const { phase, result, chain, address, error } =
    useHistoricalAnalysis(publicId);
  const router = useRouter();
  const t = useTranslations("analyze");

  function handleRecalculate() {
    if (chain && address) {
      router.push(`/analyze?chain=${chain}&address=${address}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex animate-fade-up flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="cursor-pointer" size="sm" variant="ghost">
            <Link href="/">
              <ArrowLeftIcon data-icon="inline-start" />
              {t("back")}
            </Link>
          </Button>
          <div className="hidden h-5 w-px bg-border/50 sm:block" />
          <div className="flex items-center gap-2">
            {chain && (
              <Badge
                className="border-primary/20 font-mono text-xs"
                variant="outline"
              >
                {chain}
              </Badge>
            )}
            <Badge
              className="text-[0.6rem] uppercase tracking-[0.2em]"
              variant="secondary"
            >
              {t("badges.analysis", { id: publicId })}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chain && address && <QuickActions address={address} chain={chain} />}
          {phase === "completed" && (
            <Button
              className="cursor-pointer"
              onClick={handleRecalculate}
              size="sm"
              variant="outline"
            >
              <RefreshCwIcon data-icon="inline-start" />
              {t("recalculate")}
            </Button>
          )}
        </div>
      </div>

      {/* Address bar */}
      {address && (
        <div className="flex animate-fade-up animate-fade-up-delay-1 flex-col gap-3 rounded-2xl border border-border/30 bg-card/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-[0.6rem] text-muted-foreground/60 uppercase tracking-[0.2em]">
              {t("walletAnalyzed")}
            </p>
            <p className="mt-1 truncate font-mono text-foreground/90 text-sm">
              {address}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="border-border/40 text-[0.65rem] uppercase tracking-[0.2em]"
              variant="outline"
            >
              {(() => {
                if (phase === "completed") {
                  return t("status.history");
                }
                if (phase === "error") {
                  return t("status.error");
                }
                return t("status.loading");
              })()}
            </Badge>
            <Button
              aria-label={t("back")}
              className="shrink-0 cursor-pointer"
              onClick={() => navigator.clipboard.writeText(address)}
              size="icon-xs"
              variant="ghost"
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
            <p className="text-muted-foreground text-sm">
              {t("historical.loading")}
            </p>
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
              <p className="font-heading font-medium text-sm">
                {t("error.notFound")}
              </p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
            <Button asChild className="cursor-pointer" variant="outline">
              <Link href="/">{t("back")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {phase === "completed" && result && (
        <>
          {/* Score + Reasoning */}
          <div className="grid animate-fade-up animate-fade-up-delay-2 gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="glass-panel glow-line overflow-hidden">
              <CardContent className="flex items-center justify-center p-4">
                <ScoreGauge
                  confidence={result.confidence}
                  score={result.score}
                />
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BrainCircuitIcon className="size-4 text-accent" />
                  <CardTitle className="text-xs">
                    {t("reasoning.title")}
                  </CardTitle>
                </div>
                <CardDescription className="sr-only">
                  {t("reasoning.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/85 text-sm leading-7">
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
          <Card className="glass-panel animate-fade-up animate-fade-up-delay-3">
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
          {address && (
            <div className="grid animate-fade-up animate-fade-up-delay-4 gap-4 md:grid-cols-3">
              {[
                { label: t("meta.score"), value: `${result.score}/100` },
                {
                  label: t("meta.confidence"),
                  value: `${Math.round(result.confidence * 100)}%`,
                },
                { label: t("meta.address"), value: truncateAddress(address) },
              ].map((item) => (
                <div
                  className="rounded-xl border border-border/30 bg-card/30 px-4 py-3"
                  key={item.label}
                >
                  <p className="font-heading text-[0.55rem] text-muted-foreground/50 uppercase tracking-[0.2em]">
                    {item.label}
                  </p>
                  <p className="mt-1 font-medium font-mono text-foreground/80 text-sm">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
