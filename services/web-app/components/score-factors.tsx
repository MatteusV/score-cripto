import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ScoreFactorsProps {
  positiveFactors: string[];
  riskFactors: string[];
}

export function ScoreFactors({
  positiveFactors,
  riskFactors,
}: ScoreFactorsProps) {
  const t = useTranslations("analyze.factors");

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-chart-3/10">
            <CheckCircle2Icon className="size-3.5 text-chart-3" />
          </div>
          <span className="font-heading text-muted-foreground text-xs uppercase tracking-[0.15em]">
            {t("positive")}
          </span>
        </div>
        <ul className="space-y-2">
          {positiveFactors.length === 0 && (
            <li className="rounded-lg border border-border/40 border-dashed px-3 py-2.5 text-muted-foreground/50 text-sm">
              {t("noPositive")}
            </li>
          )}
          {positiveFactors.map((factor, i) => (
            <li
              className="animate-fade-up rounded-lg border border-chart-3/15 bg-chart-3/5 px-3 py-2.5 text-foreground/85 text-sm leading-relaxed"
              key={factor}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {factor}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-destructive/10">
            <AlertTriangleIcon className="size-3.5 text-destructive" />
          </div>
          <span className="font-heading text-muted-foreground text-xs uppercase tracking-[0.15em]">
            {t("risk")}
          </span>
        </div>
        <ul className="space-y-2">
          {riskFactors.length === 0 && (
            <li className="rounded-lg border border-border/40 border-dashed px-3 py-2.5 text-muted-foreground/50 text-sm">
              {t("noRisk")}
            </li>
          )}
          {riskFactors.map((factor, i) => (
            <li
              className="animate-fade-up rounded-lg border border-destructive/15 bg-destructive/5 px-3 py-2.5 text-foreground/85 text-sm leading-relaxed"
              key={factor}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {factor}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
