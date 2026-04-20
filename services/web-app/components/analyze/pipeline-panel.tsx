"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type {
  AnalysisStage,
  AnalysisStageState,
  AnalysisStatus,
} from "@/lib/api";

interface Stage {
  detailKey: string;
  key: AnalysisStage;
  labelKey: string;
}

const STAGES: Stage[] = [
  { key: "detect", labelKey: "stageDetect", detailKey: "stageDetectDetail" },
  { key: "fetch", labelKey: "stageFetch", detailKey: "stageFetchDetail" },
  {
    key: "normalize",
    labelKey: "stageNormalize",
    detailKey: "stageNormalizeDetail",
  },
  {
    key: "sanctions",
    labelKey: "stageSanctions",
    detailKey: "stageSanctionsDetail",
  },
  { key: "mixer", labelKey: "stageMixer", detailKey: "stageMixerDetail" },
  { key: "ai", labelKey: "stageAi", detailKey: "stageAiDetail" },
  { key: "score", labelKey: "stageScore", detailKey: "stageScoreDetail" },
];

interface PipelinePanelProps {
  address: string;
  backendStatus: AnalysisStatus | null;
  chain: string;
  currentStage: AnalysisStage | null;
  onCancel: () => void;
  stageState: AnalysisStageState | null;
}

export function PipelinePanel({
  chain,
  address,
  backendStatus,
  currentStage,
  stageState,
  onCancel,
}: PipelinePanelProps) {
  const t = useTranslations("analyze.pipeline");

  const stageIdx = deriveStageIdx(currentStage, stageState, backendStatus);
  const pct = Math.round((stageIdx / STAGES.length) * 100);
  const radius = 84;
  const circumference = 2 * Math.PI * radius;

  const truncAddr = `${address.slice(0, 10)}…${address.slice(-6)}`;

  return (
    <div className="mx-auto grid max-w-3xl gap-5 p-7">
      <div className="glass-panel glow-line relative overflow-hidden rounded-2xl border border-border/30">
        {/* bg glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, oklch(0.59 0.22 295 / 14%), transparent 60%)",
          }}
        />

        <div className="relative p-8 md:p-9">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-[9px] border border-accent/30 bg-accent/10 text-accent"
                style={{ animation: "spin 2s linear infinite" }}
              >
                <svg
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </span>
              <div>
                <p className="font-heading text-[9px] text-accent uppercase tracking-[0.3em]">
                  {t("title")}
                </p>
                <p className="mt-0.5 font-mono text-muted-foreground text-xs">
                  {chain} · {truncAddr}
                </p>
              </div>
            </div>
            <Button
              className="cursor-pointer"
              onClick={onCancel}
              size="sm"
              variant="ghost"
            >
              {t("cancel")}
            </Button>
          </div>

          {/* Central SVG ring */}
          <div className="flex items-center justify-center py-4 pb-6">
            <div className="relative flex size-[200px] items-center justify-center">
              <svg
                aria-hidden
                className="absolute inset-0 -rotate-90"
                height="200"
                width="200"
              >
                <circle
                  cx="100"
                  cy="100"
                  fill="none"
                  r={radius}
                  stroke="oklch(1 0 0 / 6%)"
                  strokeWidth="10"
                />
                <circle
                  cx="100"
                  cy="100"
                  fill="none"
                  r={radius}
                  stroke="var(--primary, oklch(0.74 0.19 66))"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (pct / 100) * circumference}
                  strokeLinecap="round"
                  strokeWidth="10"
                  style={{
                    transition:
                      "stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)",
                    filter: "drop-shadow(0 0 12px oklch(0.74 0.19 66))",
                  }}
                />
              </svg>
              <div
                aria-label={`${pct}% ${t("processing")}`}
                aria-live="polite"
                className="relative text-center"
                role="status"
              >
                <span
                  className="font-bold font-heading text-primary leading-none"
                  style={{ fontSize: 44 }}
                >
                  {pct}
                  <span className="text-lg text-muted-foreground">%</span>
                </span>
                <p className="mt-1.5 font-heading text-[9px] text-muted-foreground uppercase tracking-[0.3em]">
                  {t("processing")}
                </p>
              </div>
            </div>
          </div>

          {/* Stage list */}
          <div
            aria-label="Pipeline stages"
            aria-live="polite"
            className="flex flex-col gap-1.5"
          >
            {STAGES.map((stage, i) => {
              const done = i < stageIdx;
              const active = i === stageIdx - 1 && stageIdx <= STAGES.length;
              const pending = i >= stageIdx;

              return (
                <div
                  className="flex items-center gap-3.5 rounded-[10px] px-3.5 py-2.5 transition-all duration-300"
                  key={stage.key}
                  style={{
                    background: active
                      ? "oklch(0.74 0.19 66 / 8%)"
                      : "transparent",
                    border: active
                      ? "1px solid oklch(0.74 0.19 66 / 30%)"
                      : "1px solid transparent",
                    opacity: pending && !active ? 0.4 : 1,
                  }}
                >
                  {/* Stage indicator */}
                  <span
                    aria-hidden
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{
                      background: done
                        ? "oklch(0.69 0.19 162)"
                        : active
                          ? "oklch(0.74 0.19 66)"
                          : "var(--muted, oklch(0.27 0 0))",
                      color:
                        done || active ? "white" : "var(--muted-foreground)",
                    }}
                  >
                    {done ? (
                      <svg
                        fill="none"
                        height="11"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3.5"
                        viewBox="0 0 24 24"
                        width="11"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : active ? (
                      <span
                        className="size-2 rounded-full bg-white"
                        style={{
                          animation: "scDotPulse 1s ease-in-out infinite",
                        }}
                      />
                    ) : (
                      <span className="font-bold font-mono text-[9px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    )}
                  </span>

                  {/* Stage info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-semibold text-[12.5px]"
                      style={{
                        color: active
                          ? "oklch(0.74 0.19 66)"
                          : done
                            ? "var(--foreground)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {t(stage.labelKey as Parameters<typeof t>[0])}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                      {t(stage.detailKey as Parameters<typeof t>[0])}
                    </p>
                  </div>

                  {active && (
                    <span className="font-mono text-[10px] text-primary">
                      {t("stageActive")}
                    </span>
                  )}
                  {done && (
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: "oklch(0.69 0.19 162)" }}
                    >
                      {t("stageDone")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function deriveStageIdx(
  currentStage: AnalysisStage | null,
  stageState: AnalysisStageState | null,
  backendStatus: AnalysisStatus | null
): number {
  if (backendStatus === "completed") {
    return STAGES.length;
  }
  if (!currentStage) {
    return 0;
  }
  const idx = STAGES.findIndex((s) => s.key === currentStage);
  if (idx < 0) {
    return 0;
  }
  return stageState === "completed" ? idx + 1 : idx;
}
