import Link from "next/link"
import { CheckIcon, ZapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PlanFeature {
  label: string
  included: boolean
}

interface PlanCardProps {
  name: string
  price: string
  period?: string
  description: string
  features: PlanFeature[]
  featured?: boolean
  current?: boolean
  ctaLabel?: string
  ctaHref?: string
  onUpgrade?: () => void
}

export function PlanCard({
  name,
  price,
  period = "/mês",
  description,
  features,
  featured = false,
  current = false,
  ctaLabel,
  ctaHref,
  onUpgrade,
}: PlanCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6",
        featured
          ? "border-primary/35 bg-primary/5 shadow-[0_0_40px_oklch(0.74_0.19_66/12%)]"
          : "border-border bg-card",
      )}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-3 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase">
            <ZapIcon className="size-2.5" strokeWidth={3} />
            Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <p className="font-heading text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
          {name}
        </p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-heading text-3xl font-bold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </div>

      <ul className="mb-6 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-2.5 text-sm">
            <CheckIcon
              className={cn(
                "size-3.5 shrink-0",
                f.included ? "text-primary" : "text-muted-foreground/30",
              )}
              strokeWidth={3}
            />
            <span className={f.included ? "text-foreground" : "text-muted-foreground/50 line-through"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {current ? (
        <Button variant="outline" disabled className="w-full cursor-default">
          Plano atual
        </Button>
      ) : onUpgrade ? (
        <Button
          onClick={onUpgrade}
          className={cn("w-full cursor-pointer", featured && "glow-gold")}
          variant={featured ? "default" : "outline"}
        >
          {ctaLabel ?? "Assinar"}
        </Button>
      ) : ctaHref ? (
        <Button
          asChild
          className={cn("w-full cursor-pointer", featured && "glow-gold")}
          variant={featured ? "default" : "outline"}
        >
          <Link href={ctaHref}>{ctaLabel ?? "Assinar"}</Link>
        </Button>
      ) : null}
    </div>
  )
}
