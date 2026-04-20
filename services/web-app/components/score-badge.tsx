import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  className?: string;
  score: number;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const high = score >= 70;
  const mid = score >= 40;

  let variantClass: string;
  if (high) {
    variantClass = "bg-primary/15 text-primary";
  } else if (mid) {
    variantClass = "bg-amber-500/15 text-amber-400";
  } else {
    variantClass = "bg-destructive/15 text-destructive";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 font-bold font-heading text-xs",
        variantClass,
        className
      )}
    >
      {score}
    </span>
  );
}
