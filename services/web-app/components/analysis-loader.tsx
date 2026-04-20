"use client";

import type { AnalysisStatus } from "@/lib/api";

interface AnalysisLoaderProps {
  backendStatus: AnalysisStatus | null;
}

const statusConfig: Record<string, { message: string; detail: string }> = {
  pending: {
    message: "Coletando dados on-chain",
    detail: "Buscando transações, contrapartes e metadados da carteira",
  },
  processing: {
    message: "IA processando score",
    detail: "Analisando padrões e gerando reasoning de confiabilidade",
  },
};

export function AnalysisLoader({ backendStatus }: AnalysisLoaderProps) {
  const config =
    statusConfig[backendStatus ?? "pending"] ?? statusConfig.pending;

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16">
      {/* Orbital spinner */}
      <div className="relative flex items-center justify-center">
        <div className="size-24 animate-spin rounded-full border border-border/30 border-t-primary/80 [animation-duration:2s]" />
        <div
          className="absolute size-16 animate-spin rounded-full border border-transparent border-b-accent/50 [animation-duration:1.4s]"
          style={{ animationDirection: "reverse" }}
        />
        <div className="absolute size-8 animate-spin rounded-full border border-transparent border-t-chart-3/40 [animation-duration:3s]" />
        <div className="absolute size-2 animate-pulse rounded-full bg-primary" />
      </div>

      <div className="max-w-xs space-y-2 text-center">
        <p className="font-heading font-medium text-foreground text-sm tracking-wide">
          {config.message}
        </p>
        <p className="text-muted-foreground/70 text-xs leading-relaxed">
          {config.detail}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            className="size-1 animate-pulse rounded-full bg-primary/50"
            key={i}
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
