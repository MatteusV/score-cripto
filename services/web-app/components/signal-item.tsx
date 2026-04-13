import { cn } from "@/lib/utils"

interface SignalItemProps {
  label: string
  detail?: string
  weight: number
  className?: string
}

export function SignalItem({ label, detail, weight, className }: SignalItemProps) {
  const positive = weight > 0

  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 font-heading text-xs font-bold",
          positive
            ? "bg-green-400/10 text-green-400"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {positive ? "+" : ""}{weight} pts
      </span>
    </div>
  )
}
