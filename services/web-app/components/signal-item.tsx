import { cn } from "@/lib/utils";

interface SignalItemProps {
  className?: string;
  detail?: string;
  label: string;
  weight: number;
}

export function SignalItem({
  label,
  detail,
  weight,
  className,
}: SignalItemProps) {
  const positive = weight > 0;

  return (
    <div
      className={cn("flex items-start justify-between gap-4 py-3", className)}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground text-sm">{label}</p>
        {detail && (
          <p className="mt-0.5 text-muted-foreground text-xs">{detail}</p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 font-bold font-heading text-xs",
          positive
            ? "bg-green-400/10 text-green-400"
            : "bg-destructive/10 text-destructive"
        )}
      >
        {positive ? "+" : ""}
        {weight} pts
      </span>
    </div>
  );
}
