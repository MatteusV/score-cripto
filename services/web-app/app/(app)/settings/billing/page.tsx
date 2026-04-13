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
  const pct = limit > 0 ? Math.min((count / limit) * 100, 100) : 0
  const color =
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-400" : "bg-primary"

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Análises este mês</span>
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
        {limit - count} análise{limit - count !== 1 ? "s" : ""} restante
        {limit - count !== 1 ? "s" : ""} — reseta no dia 1 do próximo mês
      </p>
    </div>
  )
}

export default function BillingPage() {
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

  const plan = user?.plan ?? "FREE_TIER"

  const FREE_FEATURES = [
    { label: "5 análises por mês",          included: true  },
    { label: "Score completo 0-100",         included: true  },
    { label: "Fatores positivos e de risco", included: true  },
    { label: "Redes EVM principais",         included: true  },
    { label: "Cache prioritário",            included: false },
    { label: "Histórico de análises",        included: false },
  ]

  const PRO_FEATURES = [
    { label: "15 análises por mês",          included: true },
    { label: "Score completo 0-100",         included: true },
    { label: "Fatores positivos e de risco", included: true },
    { label: "Todas as redes suportadas",    included: true },
    { label: "Cache prioritário",            included: true },
    { label: "Histórico de análises",        included: true },
  ]

  return (
    <div className="flex flex-col">
      <Topbar title="Planos & Billing" subtitle="Gerencie seu plano e acompanhe o uso mensal" />

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
                  Plano {isPro ? "Pro" : "Gratuito"}
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
                  {loadingSub ? "..." : subscription?.status === "active" ? "Ativo" : "—"}
                </span>
              </div>
              {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                <p className="mt-1 text-xs text-destructive">
                  Cancelamento em{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
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
                  Abrindo Stripe…
                </>
              ) : (
                <>
                  <ArrowRightIcon className="size-4" />
                  Fazer upgrade para Pro
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
                  Abrindo portal…
                </>
              ) : (
                <>
                  <ExternalLinkIcon className="size-4" />
                  Gerenciar assinatura
                </>
              )}
            </Button>
          )}
        </div>

        {/* Usage */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <ZapIcon className="size-4 text-primary" strokeWidth={1.75} />
            <span className="font-heading text-sm font-semibold tracking-wider">Uso mensal</span>
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
            <span className="font-heading text-sm font-semibold tracking-wider">Planos disponíveis</span>
          </div>
          <ViewTransition>
            <div className="grid gap-5 sm:grid-cols-2">
              <PlanCard
                name="Free"
                price="R$0"
                period="/mês"
                description="Para explorar a plataforma e análises pontuais."
                features={FREE_FEATURES}
                current={!isPro}
                ctaLabel="Plano atual"
              />
              <PlanCard
                name="Pro"
                price="R$29,90"
                period="/mês"
                description="Para uso profissional com mais análises e recursos completos."
                features={PRO_FEATURES}
                featured
                current={isPro}
                ctaLabel="Assinar Pro"
                onUpgrade={isPro ? undefined : () => void handleCheckout()}
              />
            </div>
          </ViewTransition>
        </div>

        {/* Account info */}
        {user && (
          <div className="rounded-2xl border border-border/30 bg-card/20 p-5">
            <p className="font-heading text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              Conta
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
