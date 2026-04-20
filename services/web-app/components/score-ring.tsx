import { cn } from "@/lib/utils";

interface ScoreRingProps {
  className?: string;
  confidence?: number;
  score: number;
  size?: number;
}

export function ScoreRing({
  score,
  size = 160,
  confidence,
  className,
}: ScoreRingProps) {
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  const color =
    score >= 70
      ? "oklch(0.74 0.19 66)" // gold
      : score >= 40
        ? "oklch(0.74 0.16 85)" // amber
        : "oklch(0.63 0.24 28)"; // red

  return (
    <div
      className={cn(
        "relative flex items-center justify-center text-foreground",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" height={size} width={size}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          strokeWidth="10"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-bold font-heading leading-none"
          style={{ fontSize: size * 0.2, color }}
        >
          {score}
        </span>
        <span className="mt-1 text-[10px] text-muted-foreground uppercase tracking-widest">
          Score
        </span>
        {confidence !== undefined && (
          <span className="mt-0.5 text-[9px] text-muted-foreground/60">
            {Math.round(confidence * 100)}% conf.
          </span>
        )}
      </div>
    </div>
  );
}
