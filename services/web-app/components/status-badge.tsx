import { cn } from "@/lib/utils";

type Verdict = "trusted" | "attention" | "risk" | "unknown";

const VERDICTS: Record<
  Verdict,
  { label: string; dot: string; bg: string; text: string }
> = {
  trusted: {
    label: "Confiável",
    dot: "bg-green-400",
    bg: "bg-green-400/10",
    text: "text-green-400",
  },
  attention: {
    label: "Atenção",
    dot: "bg-amber-400",
    bg: "bg-amber-400/10",
    text: "text-amber-400",
  },
  risk: {
    label: "Risco Alto",
    dot: "bg-destructive",
    bg: "bg-destructive/10",
    text: "text-destructive",
  },
  unknown: {
    label: "Desconhecido",
    dot: "bg-muted-foreground",
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
};

function scoreToVerdict(score: number): Verdict {
  if (score >= 70) {
    return "trusted";
  }
  if (score >= 40) {
    return "attention";
  }
  return "risk";
}

interface StatusBadgeProps {
  className?: string;
  pulse?: boolean;
  score?: number;
  verdict?: Verdict;
}

export function StatusBadge({
  verdict,
  score,
  pulse = true,
  className,
}: StatusBadgeProps) {
  const v =
    verdict ?? (score === undefined ? "unknown" : scoreToVerdict(score));
  const cfg = VERDICTS[v];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-xs",
        cfg.bg,
        cfg.text,
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", cfg.dot, pulse && "dot-pulse")}
      />
      {cfg.label}
    </span>
  );
}
