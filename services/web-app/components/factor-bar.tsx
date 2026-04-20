import { cn } from "@/lib/utils";

interface FactorBarProps {
  className?: string;
  label: string;
  max?: number;
  value: number;
  variant?: "primary" | "accent" | "green" | "red";
}

export function FactorBar({
  label,
  value,
  max = 100,
  variant = "primary",
  className,
}: FactorBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  const barColor = {
    primary: "bg-primary",
    accent: "bg-accent",
    green: "bg-green-400",
    red: "bg-destructive",
  }[variant];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-heading font-semibold text-foreground">
          {value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            barColor
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
