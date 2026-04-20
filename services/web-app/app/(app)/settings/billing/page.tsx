"use client";

import {
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LockIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

interface Subscription {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  plan: string;
  status: string;
}

type Cycle = "monthly" | "annual";

const PLAN_PRICES = { free: 0, pro: 29, team: 99 } as const;

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) {
    return null;
  }
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function currentPlanLabel(
  loadingSub: boolean,
  subStatus: string | undefined,
  isPro: boolean,
  t: (key: string) => string
): string {
  if (loadingSub) {
    return "...";
  }
  if (subStatus === "active" || isPro) {
    return t("currentPlan.active");
  }
  return "—";
}

export default function BillingPage() {
  const t = useTranslations("billing");
  const { user, isPro, analysisCount, analysisLimit, analysisRemaining } =
    useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [redirecting, setRedirecting] = useState<"checkout" | "portal" | null>(
    null
  );

  useEffect(() => {
    fetch("/api/billing/subscription", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Subscription) => setSubscription(d))
      .catch(() => null)
      .finally(() => setLoadingSub(false));
  }, []);

  async function handleCheckout() {
    setRedirecting("checkout");
    try {
      const res = await fetch("/api/billing/checkout", { cache: "no-store" });
      const data = (await res.json()) as { checkoutUrl?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } finally {
      setRedirecting(null);
    }
  }

  async function handlePortal() {
    setRedirecting("portal");
    try {
      const res = await fetch("/api/billing/portal", { cache: "no-store" });
      const data = (await res.json()) as { portalUrl?: string };
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } finally {
      setRedirecting(null);
    }
  }

  const cycleMul = cycle === "annual" ? 10 : 1;
  const periodLabel =
    cycle === "annual" ? t("plans.periodAnnual") : t("plans.period");
  const renewDate = formatDate(subscription?.currentPeriodEnd);

  const freeFeatures = t.raw("plans.freeFeatures") as string[];
  const proFeatures = t.raw("plans.proFeatures") as string[];
  const teamFeatures = t.raw("plans.teamFeatures") as string[];

  const plans = useMemo(
    () => [
      {
        id: "free" as const,
        name: t("plans.freeName"),
        caption: t("plans.freeCaption"),
        priceLabel: t("plans.freePrice"),
        amount: PLAN_PRICES.free,
        accent: "text-muted-foreground",
        ring: "border-border",
        bg: "bg-card",
        featured: false,
        current: !isPro,
        // Free plan has only 3 features active in the design.
        features: freeFeatures.map((label, i) => ({ label, ok: i < 3 })),
        cta: isPro ? t("plans.startFree") : t("plans.current"),
      },
      {
        id: "pro" as const,
        name: t("plans.proName"),
        caption: t("plans.proCaption"),
        priceLabel: formatBRL(PLAN_PRICES.pro * cycleMul),
        amount: PLAN_PRICES.pro,
        accent: "text-primary",
        ring: "border-primary/30",
        bg: "bg-primary/[0.06]",
        featured: true,
        current: isPro,
        // Pro plan: 5 included, last (API) excluded.
        features: proFeatures.map((label, i) => ({ label, ok: i < 5 })),
        cta: isPro ? t("plans.current") : t("plans.subscribe"),
      },
      {
        id: "team" as const,
        name: t("plans.teamName"),
        caption: t("plans.teamCaption"),
        priceLabel: formatBRL(PLAN_PRICES.team * cycleMul),
        amount: PLAN_PRICES.team,
        accent: "text-accent",
        ring: "border-accent/40",
        bg: "bg-card",
        featured: false,
        current: false,
        features: teamFeatures.map((label) => ({ label, ok: true })),
        cta: t("plans.comingSoon"),
        comingSoon: true,
      },
    ],
    [t, cycleMul, isPro, freeFeatures, proFeatures, teamFeatures]
  );

  return (
    <div className="flex flex-col">
      <Topbar subtitle={t("subtitle")} title={t("title")} />

      <div className="flex flex-col gap-6 px-6 pt-6 pb-12 lg:px-7">
        <BillingHero
          analysisCount={analysisCount}
          analysisLimit={analysisLimit}
          analysisRemaining={analysisRemaining}
          isPro={isPro}
          loadingSub={loadingSub}
          onCheckout={handleCheckout}
          onPortal={handlePortal}
          redirecting={redirecting}
          renewDate={renewDate}
          subscription={subscription}
          t={t}
        />

        {/* ── Plans grid ──────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                {t("cycle.label")}
              </p>
              <h2 className="m-0 font-bold font-heading text-2xl tracking-wide">
                {t("cycle.headline")}
              </h2>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-0.5 rounded-xl border border-border bg-muted p-0.5">
                {(
                  [
                    ["monthly", t("cycle.monthly")],
                    ["annual", t("cycle.annual")],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    className={cn(
                      "cursor-pointer rounded-lg px-3.5 py-1.5 font-bold font-heading text-[11px] uppercase tracking-wider transition-colors",
                      cycle === v
                        ? "bg-card text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    key={v}
                    onClick={() => setCycle(v)}
                    type="button"
                  >
                    {l}
                  </button>
                ))}
              </div>
              {cycle === "annual" && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-bold text-[10px] text-primary uppercase tracking-wider">
                  {t("cycle.save")}
                </span>
              )}
            </div>
          </div>

          {cycle === "annual" && (
            // Annual price needs a separate Stripe Price ID before wiring; toggle is visual-only for now.
            <p className="mb-3 font-mono text-[11px] text-muted-foreground">
              {t("cycle.comingSoon")}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((p) => (
              <article
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-7",
                  p.featured
                    ? "border-primary/30 bg-primary/[0.06] shadow-[0_20px_60px_-30px_oklch(0.74_0.19_66/40%)]"
                    : `${p.ring} ${p.bg}`
                )}
                key={p.id}
              >
                {p.featured && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-5 -right-5 size-24 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, oklch(0.74 0.19 66 / 30%), transparent 70%)",
                    }}
                  />
                )}
                {p.current && (
                  <span className="absolute top-4 right-4 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-bold text-[9px] text-primary uppercase tracking-wider">
                    {t("plans.atualBadge")}
                  </span>
                )}
                {p.comingSoon && (
                  <span className="absolute top-4 right-4 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-bold text-[9px] text-accent uppercase tracking-wider">
                    {t("plans.soonBadge")}
                  </span>
                )}

                <p
                  className={cn(
                    "mb-2.5 font-bold font-heading text-[10px] uppercase tracking-[0.3em]",
                    p.accent
                  )}
                >
                  {p.name}
                </p>
                <p className="mb-3.5 text-muted-foreground text-xs">
                  {p.caption}
                </p>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-bold font-heading text-4xl text-foreground leading-none">
                    {p.priceLabel}
                  </span>
                  {p.amount > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {periodLabel}
                    </span>
                  )}
                </div>
                <p className="mb-5 min-h-[14px] font-mono text-[10.5px] text-muted-foreground">
                  {cycle === "annual" && p.amount > 0
                    ? t("plans.monthlyEquivalent", {
                        amount: formatBRL((p.amount * cycleMul) / 12),
                      })
                    : "\u00A0"}
                </p>

                <Button
                  className={cn(
                    "mb-5 w-full cursor-pointer justify-center",
                    p.current && "cursor-default"
                  )}
                  disabled={p.current || p.comingSoon}
                  onClick={() => {
                    if (p.id === "pro" && !p.current) {
                      handleCheckout().catch(() => {
                        /* handled via state */
                      });
                    }
                  }}
                  size="default"
                  variant={p.featured && !p.current ? "default" : "outline"}
                >
                  {p.cta}
                </Button>

                <ul className="flex flex-col gap-2.5 border-border border-t pt-5">
                  {p.features.map((f) => (
                    <li
                      className={cn(
                        "flex items-center gap-2.5 text-[12.5px]",
                        f.ok ? "text-foreground" : "text-muted-foreground/60"
                      )}
                      key={f.label}
                    >
                      <span
                        className={cn(
                          "inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                          f.ok
                            ? "bg-green-500/15 text-green-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {f.ok ? (
                          <CheckIcon className="size-2.5" strokeWidth={3.5} />
                        ) : (
                          <span className="block h-0.5 w-2 rounded-full bg-current" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "leading-snug",
                          !f.ok && "line-through decoration-muted-foreground/40"
                        )}
                      >
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ── Detailed usage + Manage on Stripe ──────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                {t("usage.detailedTitle")}
              </p>
              {renewDate && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t("usage.cycleRange", {
                    start: t("currentPlan.active"),
                    end: renewDate,
                  })}
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: t("usage.analyses"),
                  used: analysisCount,
                  cap: analysisLimit,
                  color: "var(--primary)",
                  locked: false,
                },
                {
                  label: t("usage.watchlist"),
                  used: 0,
                  cap: 0,
                  color: "var(--accent)",
                  locked: true,
                },
                {
                  label: t("usage.exports"),
                  used: 0,
                  cap: 0,
                  color: "oklch(0.69 0.19 162)",
                  locked: true,
                },
                {
                  label: t("usage.api"),
                  used: 0,
                  cap: 0,
                  color: "var(--muted-foreground)",
                  locked: true,
                },
              ].map((u) => (
                <div
                  className={cn(
                    "relative rounded-xl border border-border bg-card/40 p-4",
                    u.locked && "opacity-50"
                  )}
                  key={u.label}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="font-medium text-[11.5px] text-foreground">
                      {u.label}
                    </span>
                    {u.locked && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 font-bold text-[9px] text-muted-foreground uppercase tracking-wider">
                        <LockIcon className="size-2.5" />
                        {t("usage.lockedTeam")}
                      </span>
                    )}
                  </div>
                  <div
                    className="mb-2 font-bold font-heading text-[22px] leading-none"
                    style={{ color: u.color as string }}
                  >
                    {u.locked ? "—" : u.used}
                    <span className="ml-1 text-muted-foreground text-xs">
                      / {u.locked ? "∞" : u.cap || "—"}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width:
                          u.locked || u.cap === 0
                            ? "0%"
                            : `${(u.used / u.cap) * 100}%`,
                        background: u.color as string,
                        boxShadow: `0 0 6px ${u.color}`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manage-on-Stripe card (replaces fake Visa card) */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                {t("manage.eyebrow")}
              </p>
              <SparklesIcon
                className="size-4 text-primary"
                strokeWidth={1.75}
              />
            </div>
            <h3 className="mb-2 font-bold font-heading text-foreground text-lg">
              {t("manage.title")}
            </h3>
            <p className="mb-5 text-[12.5px] text-muted-foreground leading-relaxed">
              {t("manage.body")}
            </p>
            <Button
              className="mb-5 w-full cursor-pointer gap-1.5"
              disabled={redirecting === "portal" || !isPro}
              onClick={() => {
                handlePortal().catch(() => {
                  /* handled via state */
                });
              }}
              size="sm"
              variant={isPro ? "default" : "outline"}
            >
              <ExternalLinkIcon className="size-3.5" strokeWidth={2.5} />
              {redirecting === "portal" ? t("openingPortal") : t("manage.cta")}
            </Button>
            <dl className="flex flex-col gap-2 border-border border-t pt-4 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  {t("manage.nextCharge")}
                </dt>
                <dd className="font-mono text-foreground">
                  {isPro && renewDate
                    ? `${renewDate} · ${formatBRL(PLAN_PRICES.pro)}`
                    : t("manage.fallback")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  {t("manage.billingEmail")}
                </dt>
                <dd className="font-mono text-[11px] text-foreground">
                  {user?.email ?? t("manage.fallback")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  {t("manage.billingCountry")}
                </dt>
                <dd className="text-foreground">
                  {isPro ? "Brasil" : t("manage.fallback")}
                </dd>
              </div>
            </dl>
            {!isPro && (
              <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                <DownloadIcon className="size-3" />
                {t("manage.noActive")}
              </p>
            )}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section>
          <p className="mb-3.5 font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            {t("faq.eyebrow")}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {(t.raw("faq.items") as [string, string][]).map(([q, a]) => (
              <div
                className="rounded-2xl border border-border bg-card/60 p-5"
                key={q}
              >
                <p className="mb-1.5 font-semibold text-[13px] text-foreground">
                  {q}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface BillingHeroProps {
  analysisCount: number;
  analysisLimit: number;
  analysisRemaining: number;
  isPro: boolean;
  loadingSub: boolean;
  onCheckout: () => Promise<void>;
  onPortal: () => Promise<void>;
  redirecting: "checkout" | "portal" | null;
  renewDate: string | null;
  subscription: Subscription | null;
  t: ReturnType<typeof useTranslations>;
}

function BillingHero({
  analysisCount,
  analysisLimit,
  analysisRemaining,
  isPro,
  loadingSub,
  onCheckout,
  onPortal,
  redirecting,
  renewDate,
  subscription,
  t,
}: BillingHeroProps) {
  const renewSuffix =
    renewDate && subscription?.status === "active"
      ? ` · ${t("currentPlan.renewsIn", { date: renewDate })}`
      : "";
  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 100% at 0% 0%, oklch(0.74 0.19 66 / 14%), transparent 60%), radial-gradient(60% 90% at 100% 100%, oklch(0.59 0.22 295 / 10%), transparent 60%)",
        }}
      />
      <div className="relative grid gap-7 p-7 lg:grid-cols-[1.4fr_1fr] lg:p-8">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <p className="font-bold font-heading text-[10px] text-primary uppercase tracking-[0.3em]">
              {t("hero.eyebrow")}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-bold text-[10px] text-primary uppercase tracking-wider">
              <span className="dot-pulse size-1.5 rounded-full bg-primary" />
              {currentPlanLabel(loadingSub, subscription?.status, isPro, t)}
              {renewSuffix}
            </span>
          </div>
          <div className="mb-1.5 flex items-baseline gap-3">
            <span className="font-bold font-heading text-5xl text-foreground leading-none">
              {isPro ? t("plans.proName") : t("plans.freeName")}
            </span>
            <span className="font-bold font-heading text-2xl text-primary">
              {isPro ? formatBRL(PLAN_PRICES.pro) : t("plans.freePrice")}
              {isPro && (
                <span className="ml-1 font-normal text-[13px] text-muted-foreground">
                  {t("plans.period")}
                </span>
              )}
            </span>
          </div>
          <p
            className="mt-2 mb-5 max-w-lg text-muted-foreground text-sm leading-relaxed"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: markup generated by next-intl t.markup with trusted translation strings only (no user input)
            dangerouslySetInnerHTML={{
              __html: t.markup("hero.remaining", {
                remaining: String(analysisRemaining),
                strong: (chunks) =>
                  `<strong class="text-foreground">${chunks}</strong>`,
              }),
            }}
          />
          <BillingHeroActions
            isPro={isPro}
            onCheckout={onCheckout}
            onPortal={onPortal}
            redirecting={redirecting}
            t={t}
          />
        </div>

        <BillingHeroUsage
          analysisCount={analysisCount}
          analysisLimit={analysisLimit}
          renewDate={renewDate}
          t={t}
        />
      </div>
    </section>
  );
}

interface BillingHeroActionsProps {
  isPro: boolean;
  onCheckout: () => Promise<void>;
  onPortal: () => Promise<void>;
  redirecting: "checkout" | "portal" | null;
  t: ReturnType<typeof useTranslations>;
}

function BillingHeroActions({
  isPro,
  onCheckout,
  onPortal,
  redirecting,
  t,
}: BillingHeroActionsProps) {
  if (isPro) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          className="cursor-pointer gap-1.5"
          disabled={redirecting === "portal"}
          onClick={() => {
            onPortal().catch(() => {
              /* handled via state */
            });
          }}
          size="sm"
        >
          <ExternalLinkIcon className="size-3.5" strokeWidth={2.5} />
          {redirecting === "portal" ? t("openingPortal") : t("hero.manage")}
        </Button>
        <Button
          className="cursor-pointer text-muted-foreground"
          disabled={redirecting === "portal"}
          onClick={() => {
            onPortal().catch(() => {
              /* handled via state */
            });
          }}
          size="sm"
          variant="ghost"
        >
          {t("hero.pause")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className="cursor-pointer gap-1.5"
        disabled={redirecting === "checkout"}
        onClick={() => {
          onCheckout().catch(() => {
            /* handled via state */
          });
        }}
        size="sm"
      >
        <ZapIcon className="size-3.5" strokeWidth={2.5} />
        {redirecting === "checkout"
          ? t("upgradingStripe")
          : t("hero.upgradeTeam")}
      </Button>
    </div>
  );
}

interface BillingHeroUsageProps {
  analysisCount: number;
  analysisLimit: number;
  renewDate: string | null;
  t: ReturnType<typeof useTranslations>;
}

function BillingHeroUsage({
  analysisCount,
  analysisLimit,
  renewDate,
  t,
}: BillingHeroUsageProps) {
  const usageWidth =
    analysisLimit > 0 ? `${(analysisCount / analysisLimit) * 100}%` : "0%";
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <p className="font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          {t("usage.miniTitle")}
        </p>
        {renewDate && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {renewDate}
          </span>
        )}
      </div>
      <div>
        <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
          <span className="text-muted-foreground">{t("usage.analyses")}</span>
          <span className="font-mono text-foreground">
            {analysisCount}
            <span className="text-muted-foreground">
              /{analysisLimit || "—"}
            </span>
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
          <div
            className="h-full rounded-full bg-primary shadow-[0_0_6px_oklch(0.74_0.19_66)]"
            style={{ width: usageWidth }}
          />
        </div>
      </div>
    </div>
  );
}
