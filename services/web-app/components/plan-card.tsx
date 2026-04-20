import { CheckIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanFeature {
  included: boolean;
  label: string;
}

interface PlanCardProps {
  ctaHref?: string;
  ctaLabel?: string;
  current?: boolean;
  description: string;
  featured?: boolean;
  features: PlanFeature[];
  name: string;
  onUpgrade?: () => void;
  period?: string;
  price: string;
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
          : "border-border bg-card"
      )}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-3 py-0.5 font-bold text-[10px] text-primary uppercase tracking-wider">
            <ZapIcon className="size-2.5" strokeWidth={3} />
            Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <p className="font-bold font-heading text-muted-foreground text-xs uppercase tracking-[0.2em]">
          {name}
        </p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-bold font-heading text-3xl text-foreground">
            {price}
          </span>
          <span className="text-muted-foreground text-sm">{period}</span>
        </div>
        <p className="mt-2 text-muted-foreground text-xs">{description}</p>
      </div>

      <ul className="mb-6 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li className="flex items-center gap-2.5 text-sm" key={f.label}>
            <CheckIcon
              className={cn(
                "size-3.5 shrink-0",
                f.included ? "text-primary" : "text-muted-foreground/30"
              )}
              strokeWidth={3}
            />
            <span
              className={
                f.included
                  ? "text-foreground"
                  : "text-muted-foreground/50 line-through"
              }
            >
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {(() => {
        if (current) {
          return (
            <Button
              className="w-full cursor-default"
              disabled
              variant="outline"
            >
              Plano atual
            </Button>
          );
        }
        if (onUpgrade) {
          return (
            <Button
              className={cn("w-full cursor-pointer", featured && "glow-gold")}
              onClick={onUpgrade}
              variant={featured ? "default" : "outline"}
            >
              {ctaLabel ?? "Assinar"}
            </Button>
          );
        }
        if (ctaHref) {
          return (
            <Button
              asChild
              className={cn("w-full cursor-pointer", featured && "glow-gold")}
              variant={featured ? "default" : "outline"}
            >
              <Link href={ctaHref}>{ctaLabel ?? "Assinar"}</Link>
            </Button>
          );
        }
        return null;
      })()}
    </div>
  );
}
