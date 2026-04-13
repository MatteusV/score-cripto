import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
  icon?: React.ElementType
  className?: string
}

export function StatCard({ label, value, delta, deltaPositive, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">{label}</p>
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary/70" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <p className="mt-3 font-heading text-2xl font-bold text-foreground">{value}</p>
      {delta && (
        <p
          className={cn(
            "mt-1 text-xs",
            deltaPositive ? "text-green-400" : "text-destructive",
          )}
        >
          {delta}
        </p>
      )}
    </div>
  )
}
