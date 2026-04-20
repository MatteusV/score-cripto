import { cn } from "@/lib/utils";

interface SummaryChipProps {
  className?: string;
  icon?: React.ElementType;
  label: string;
  value: string | number;
  variant?: "default" | "primary" | "accent" | "green" | "red";
}

export function SummaryChip({
  label,
  value,
  icon: Icon,
  variant = "default",
  className,
}: SummaryChipProps) {
  const styles = {
    default: "border-border bg-card text-foreground",
    primary: "border-primary/25 bg-primary/10 text-primary",
    accent: "border-accent/25 bg-accent/10 text-accent",
    green: "border-green-400/25 bg-green-400/10 text-green-400",
    red: "border-destructive/25 bg-destructive/10 text-destructive",
  }[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        styles,
        className
      )}
    >
      {Icon && (
        <Icon className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
      )}
      <div>
        <p className="font-bold font-heading text-lg leading-none">{value}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider opacity-70">
          {label}
        </p>
      </div>
    </div>
  );
}
