"use client"

import { useEffect, useState } from "react"
import { ViewTransition } from "react"
import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useUser } from "@/hooks/use-user"
import { PlanCard } from "@/components/plan-card"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"

interface Subscription {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

function UsageBar({ count, limit }: { count: number; limit: number }) {
  const t = useTranslations("billing")
  const pct = limit > 0 ? Math.min((count / limit) * 100, 100) : 0
  const color =
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-400" : "bg-primary"

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t("usage.month")}</span>
        <span className="font-heading font-semibold tabular-nums text-foreground">
          {count} / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/6">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t("usage.remaining", { remaining: limit - count })}
      </p>
    </div>
  )
}

export default function BillingPage() {
  const t = useTranslations("billing")
  const { user, isPro, analysisCount, analysisLimit } = useUser()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [redirecting, setRedirecting] = useState<"checkout" | "portal" | null>(null)

  useEffect(() => {
    fetch("/api/billing/subscription", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Subscription) => setSubscription(d))
      .catch(() => null)
      .finally(() => setLoadingSub(false))
  }, [])

  async function handleCheckout() {
    setRedirecting("checkout")
    try {
      const res = await fetch("/api/billing/checkout", { cache: "no-store" })
      const data = await res.json() as { checkoutUrl?: string }
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
    } finally {
      setRedirecting(null)
    }
  }

  async function handlePortal() {
    setRedirecting("portal")
    try {
      const res = await fetch("/api/billing/portal", { cache: "no-store" })
      const data = await res.json() as { portalUrl?: string }
      if (data.portalUrl) window.location.href = data.portalUrl
    } finally {
      setRedirecting(null)
    }
  }

  const freeLabels = t.raw("plans.freeFeatures") as string[]
  const proLabels  = t.raw("plans.proFeatures")  as string[]

  const FREE_FEATURES = [
    { label: freeLabels[0], included: true  },
    { label: freeLabels[1], included: true  },
    { label: freeLabels[2], included: true  },
    { label: freeLabels[3], included: true  },
    { label: freeLabels[4], included: false },
    { label: freeLabels[5], included: false },
  ]

  const PRO_FEATURES = [
    { label: proLabels[0], included: true },
    { label: proLabels[1], included: true },
    { label: proLabels[2], included: true },
    { label: proLabels[3], included: true },
    { label: proLabels[4], included: true },
    { label: proLabels[5], included: true },
  ]

  return (
    <div className="flex flex-col">
      <Topbar title={t("title")} subtitle={t("subtitle")} />

      <div className="flex flex-col gap-8 p-6">
        {/* Current plan banner */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <CreditCardIcon className="size-5 text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-sm font-bold text-foreground">
                  {isPro ? t("currentPlan.pro") : t("currentPlan.free")}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    loadingSub
                      ? "bg-muted text-muted-foreground"
                      : subscription?.status === "active"
                        ? "bg-green-400/10 text-green-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {loadingSub ? "..." : subscription?.status === "active" ? t("currentPlan.active") : "—"}
                </span>
              </div>
              {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                <p className="mt-1 text-xs text-destructive">
                  {t("currentPlan.cancelAt", {
                    date: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
                  })}
                </p>
              )}
            </div>
          </div>

          {!isPro ? (
            <Button
              onClick={() => void handleCheckout()}
              disabled={redirecting === "checkout"}
              className="cursor-pointer gap-2 shrink-0"
            >
              {redirecting === "checkout" ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("upgradingStripe")}
                </>
              ) : (
                <>
                  <ArrowRightIcon className="size-4" />
                  {t("upgrade")}
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void handlePortal()}
              disabled={redirecting === "portal"}
              className="cursor-pointer gap-2 shrink-0"
            >
              {redirecting === "portal" ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("openingPortal")}
                </>
              ) : (
                <>
                  <ExternalLinkIcon className="size-4" />
                  {t("manageSubscription")}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Usage */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <ZapIcon className="size-4 text-primary" strokeWidth={1.75} />
            <span className="font-heading text-sm font-semibold tracking-wider">{t("usage.title")}</span>
          </div>
          {user ? (
            <UsageBar count={analysisCount} limit={analysisLimit} />
          ) : (
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          )}
        </div>

        {/* Plan cards */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <SparklesIcon className="size-4 text-accent" strokeWidth={1.75} />
            <span className="font-heading text-sm font-semibold tracking-wider">{t("plans.title")}</span>
          </div>
          <ViewTransition>
            <div className="grid gap-5 sm:grid-cols-2">
              <PlanCard
                name={t("plans.freeName")}
                price="R$0"
                period={t("plans.period")}
                description={t("plans.freeDesc")}
                features={FREE_FEATURES}
                current={!isPro}
                ctaLabel={t("plans.current")}
              />
              <PlanCard
                name={t("plans.proName")}
                price="R$29,90"
                period={t("plans.period")}
                description={t("plans.proDesc")}
                features={PRO_FEATURES}
                featured
                current={isPro}
                ctaLabel={t("plans.subscribe")}
                onUpgrade={isPro ? undefined : () => void handleCheckout()}
              />
            </div>
          </ViewTransition>
        </div>

        {/* Account info */}
        {user && (
          <div className="rounded-2xl border border-border/30 bg-card/20 p-5">
            <p className="font-heading text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              {t("account")}
            </p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.name ?? user.email}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <CheckIcon className="size-4 text-green-400" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
