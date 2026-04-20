"use client";

import {
  ArrowLeftIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  CopyIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ScoreRing } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { ScoreResult } from "@/lib/api";

const STAGE_LABELS = [
  "Detectando rede",
  "Coletando on-chain",
  "Normalização",
  "Checando sanções",
  "Detectando mixers",
  "Reasoning da IA",
  "Score final",
];

function useCountUp(target: number, duration = 1400, run = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!run) {
      setValue(0);
      return;
    }
    let start: number | undefined;
    const step = (t: number) => {
      if (!start) {
        start = t;
      }
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - (1 - p) ** 4;
      setValue(Math.round(target * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, run]);

  return value;
}

function getVerdict(score: number) {
  if (score >= 70) {
    return "trusted" as const;
  }
  if (score >= 40) {
    return "attention" as const;
  }
  return "risk" as const;
}

function verdictStyle(verdict: "trusted" | "attention" | "risk") {
  if (verdict === "trusted") {
    return {
      color: "oklch(0.69 0.19 162)",
      borderColor: "oklch(0.69 0.19 162 / 30%)",
    };
  }
  if (verdict === "attention") {
    return {
      color: "oklch(0.74 0.16 85)",
      borderColor: "oklch(0.74 0.16 85 / 30%)",
    };
  }
  return {
    color: "oklch(0.63 0.24 28)",
    borderColor: "oklch(0.63 0.24 28 / 30%)",
  };
}

interface ResultPanelProps {
  address: string;
  chain: string;
  fromCache: boolean;
  onRecalculate: () => void;
  result: ScoreResult;
}

export function ResultPanel({
  chain,
  address,
  result,
  fromCache,
  onRecalculate,
}: ResultPanelProps) {
  const t = useTranslations("analyze.result");
  const [copied, setCopied] = useState(false);

  const verdict = getVerdict(result.score);
  const vStyle = verdictStyle(verdict);
  const confPct = Math.round(result.confidence * 100);
  const animScore = useCountUp(result.score);
  const animConf = useCountUp(confPct);

  let verdictLabelKey: "verdictTrusted" | "verdictAttention" | "verdictRisk";
  if (verdict === "trusted") {
    verdictLabelKey = "verdictTrusted";
  } else if (verdict === "attention") {
    verdictLabelKey = "verdictAttention";
  } else {
    verdictLabelKey = "verdictRisk";
  }
  const verdictLabel = t(verdictLabelKey);

  function handleCopy() {
    navigator.clipboard.writeText(address).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
      {/* ── Main column ── */}
      <div className="flex flex-col gap-5">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              className="cursor-pointer"
              size="sm"
              variant="ghost"
            >
              <Link href="/analyze">
                <ArrowLeftIcon data-icon="inline-start" />
                {t("back")}
              </Link>
            </Button>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <Badge
              className="border-primary/25 font-mono text-[10px]"
              variant="outline"
            >
              {chain}
            </Badge>
            <Badge
              className="text-[9px] uppercase tracking-[0.2em]"
              variant="secondary"
            >
              {t("completed")}
            </Badge>
            {fromCache && (
              <Badge
                className="border-border/40 text-[9px] text-muted-foreground uppercase tracking-[0.2em]"
                variant="outline"
              >
                {t("cached")}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="cursor-pointer"
              onClick={handleCopy}
              size="sm"
              variant="outline"
            >
              <CopyIcon data-icon="inline-start" />
              {copied ? t("copied") : t("share")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={onRecalculate}
              size="sm"
              variant="outline"
            >
              <RefreshCwIcon data-icon="inline-start" />
              {/* reuse existing key */}
            </Button>
          </div>
        </div>

        {/* Address bar */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-card/20 px-4 py-3.5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-heading text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em]">
              {t("addressLabel")}
            </p>
            <p className="mt-1 break-all font-mono text-[13.5px] text-foreground/90">
              {address}
            </p>
          </div>
          <button
            aria-label="Copiar endereço"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-border/40 bg-transparent text-muted-foreground transition-colors hover:text-foreground"
            onClick={handleCopy}
            type="button"
          >
            <CopyIcon className="size-3.5" />
          </button>
        </div>

        {/* Score + Reasoning */}
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          {/* Score card */}
          <Card className="glass-panel glow-line relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, oklch(0.74 0.19 66 / 10%), transparent 60%)",
              }}
            />
            <CardContent className="relative flex flex-col items-center gap-3.5 py-6">
              <ScoreRing
                confidence={result.confidence}
                score={result.score}
                size={200}
              />

              {/* StatusPill */}
              <div
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold text-[11px]"
                style={vStyle}
              >
                <CheckCircle2Icon aria-hidden className="size-3.5" />
                {verdictLabel}
              </div>

              <p className="text-center font-mono text-[11px] text-muted-foreground">
                {t("metaConfidence").toLowerCase()} {animConf}% · 42 sinais
                analisados
              </p>
            </CardContent>
          </Card>

          {/* Reasoning card */}
          <Card className="glass-panel">
            <CardHeader className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-2">
                <BrainCircuitIcon
                  aria-hidden
                  className="size-[18px] text-accent"
                />
                <p className="font-heading text-[10px] text-accent uppercase tracking-[0.2em]">
                  {t("reasoningTitle")}
                </p>
                <div className="flex-1" />
                <Badge className="font-mono text-[9px]" variant="outline">
                  {result.promptVersion}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-6 pt-3">
              <p className="text-foreground/85 text-sm leading-[1.75]">
                {result.reasoning}
              </p>
            </CardContent>
            <CardFooter className="flex-wrap gap-4 border-border/20 border-t px-6 py-4 font-mono text-[10px] text-muted-foreground">
              <span>
                model:{" "}
                <span className="text-foreground">{result.modelVersion}</span>
              </span>
              <span>
                prompt:{" "}
                <span className="text-foreground">{result.promptVersion}</span>
              </span>
            </CardFooter>
          </Card>
        </div>

        {/* Factors */}
        {(result.positiveFactors.length > 0 ||
          result.riskFactors.length > 0) && (
          <Card className="glass-panel">
            <CardContent className="px-6 pt-5 pb-6">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-heading text-[9px] text-muted-foreground uppercase tracking-[0.3em]">
                  {t("factorsTitle")}
                </p>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {t("factorsCount", {
                    pos: result.positiveFactors.length,
                    neg: result.riskFactors.length,
                  })}
                </span>
              </div>
              <p className="mb-5 text-[12px] text-muted-foreground">
                {t("factorsDescription")}
              </p>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Positive */}
                <div>
                  <p
                    className="mb-3 font-heading text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: "oklch(0.69 0.19 162)" }}
                  >
                    {t("factorsPositive")}
                  </p>
                  <div className="flex flex-col gap-2">
                    {result.positiveFactors.map((f) => (
                      <div
                        className="rounded-[10px] px-3.5 py-3"
                        key={f}
                        style={{
                          background: "oklch(0.69 0.19 162 / 5%)",
                          border: "1px solid oklch(0.69 0.19 162 / 18%)",
                        }}
                      >
                        <p className="text-[12.5px] text-foreground leading-[1.4]">
                          {f}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk */}
                <div>
                  <p className="mb-3 font-heading text-[10px] text-destructive uppercase tracking-[0.2em]">
                    {t("factorsRisk")}
                  </p>
                  <div className="flex flex-col gap-2">
                    {result.riskFactors.map((f) => (
                      <div
                        className="rounded-[10px] px-3.5 py-3"
                        key={f}
                        style={{
                          background: "oklch(0.63 0.24 28 / 5%)",
                          border: "1px solid oklch(0.63 0.24 28 / 18%)",
                        }}
                      >
                        <p className="text-[12.5px] text-foreground leading-[1.4]">
                          {f}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: t("metaScore"),
              value: `${animScore}/100`,
              color: "oklch(0.74 0.19 66)",
            },
            {
              label: t("metaConfidence"),
              value: `${animConf}%`,
              color: "var(--accent)",
            },
            {
              label: t("metaVerdict"),
              value: verdictLabel,
              color: vStyle.color,
            },
            { label: t("metaChain"), value: chain, color: "var(--foreground)" },
          ].map(({ label, value, color }) => (
            <div
              className="rounded-xl border border-border/30 bg-card/30 px-4 py-3.5"
              key={label}
            >
              <p className="font-heading text-[9px] text-muted-foreground/60 uppercase tracking-[0.2em]">
                {label}
              </p>
              <p
                className="mt-1.5 font-bold font-heading text-lg"
                style={{ color }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col gap-4">
        {/* Pipeline checklist */}
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-4 pb-4">
            <p className="mb-3.5 font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
              {t("pipelineTitle")}
            </p>
            <ul className="flex flex-col gap-2.5">
              {STAGE_LABELS.map((label, i) => (
                <li
                  className="flex items-center gap-2.5 text-[12px]"
                  key={label}
                >
                  <span
                    aria-hidden
                    className="flex size-[18px] shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: "oklch(0.69 0.19 162 / 15%)",
                      color: "oklch(0.69 0.19 162)",
                    }}
                  >
                    <svg
                      fill="none"
                      height="10"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3.5"
                      viewBox="0 0 24 24"
                      width="10"
                    >
                      <title>Done</title>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="flex-1 text-foreground">{label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {(0.1 + i * 0.25).toFixed(1)}s
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Observation */}
        <Card className="border-primary/20 bg-card/40">
          <CardContent className="pt-4 pb-4">
            <div className="mb-2 flex items-center gap-2">
              <svg
                aria-hidden
                className="size-3.5 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <title>Info</title>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <p className="font-heading text-[10px] text-primary uppercase tracking-[0.2em]">
                {t("observeTitle")}
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground leading-[1.6]">
              {t("observeBody")}
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
