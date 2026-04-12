"use client"

import { useEffect, useState, startTransition } from "react"
import Link from "next/link"
import { ViewTransition } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Subscription {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const PLAN_LABELS: Record<string, string> = {
  FREE_TIER: "Gratuito",
  PRO: "Pro",
}

const PLAN_FEATURES: Record<string, string[]> = {
  FREE_TIER: [
    "5 análises por mês",
    "Score completo 0-100",
    "Fatores positivos e de risco",
    "Redes EVM principais",
  ],
  PRO: [
    "15 análises por mês",
    "Score completo 0-100",
    "Fatores positivos e de risco",
    "Todas as redes suportadas",
    "Cache prioritário",
    "Histórico de análises",
  ],
}

function UsageBar({ count, limit }: { count: number; limit: number }) {
  const pct = Math.min((count / limit) * 100, 100)
  const color =
    pct >= 90
      ? "bg-destructive"
      : pct >= 70
        ? "bg-chart-1"
        : "bg-primary"

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Análises este mês</span>
        <span className="font-medium tabular-nums">
          {count} / {limit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
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
  const { user } = useAuth()
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
      const data = await res.json() as { checkoutUrl?: string; error?: string }
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
    } finally {
      setRedirecting(null)
    }
  }

  async function handlePortal() {
    setRedirecting("portal")
    try {
      const res = await fetch("/api/billing/portal", { cache: "no-store" })
      const data = await res.json() as { portalUrl?: string; error?: string }
      if (data.portalUrl) window.location.href = data.portalUrl
    } finally {
      setRedirecting(null)
    }
  }

  const plan = user?.plan ?? "FREE_TIER"
  const isPro = plan === "PRO"
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE_TIER

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", default: "none" }}
      default="none"
    >
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="cursor-pointer -ml-2"
          >
            <Link
              href="/"
              onClick={() =>
                startTransition(() => {})
              }
            >
              <ArrowLeftIcon className="size-4" />
              Voltar
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
              <CreditCardIcon className="size-5 text-primary" />
            </div>
            <Badge variant={isPro ? "default" : "secondary"} className="text-xs">
              {PLAN_LABELS[plan] ?? plan}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Plano e cobrança</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seu plano e acompanhe o uso mensal de análises.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Usage card */}
          <Card className="glass-panel glow-line">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ZapIcon className="size-4 text-primary" />
                Uso mensal
              </CardTitle>
              <CardDescription className="text-xs">
                Análises realizadas no período atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user ? (
                <UsageBar
                  count={user.analysisCount}
                  limit={user.analysisLimit}
                />
              ) : (
                <div className="h-12 animate-pulse rounded-lg bg-muted" />
              )}
            </CardContent>
          </Card>

          {/* Plan card */}
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SparklesIcon className="size-4 text-accent" />
                Plano atual
              </CardTitle>
              <CardDescription className="text-xs">
                {loadingSub ? (
                  <span className="inline-block h-3 w-20 animate-pulse rounded bg-muted" />
                ) : subscription?.status === "active" ? (
                  "Ativo"
                ) : (
                  subscription?.status ?? "—"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckIcon className="size-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                <ViewTransition enter="slide-up" default="none">
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    Cancelamento agendado para{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                  </p>
                </ViewTransition>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          {!isPro ? (
            <Button
              onClick={() => void handleCheckout()}
              disabled={redirecting === "checkout"}
              className="cursor-pointer"
              size="lg"
            >
              {redirecting === "checkout" ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Abrindo Stripe…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ArrowRightIcon className="size-4" />
                  Fazer upgrade para Pro
                </span>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void handlePortal()}
              disabled={redirecting === "portal"}
              className="cursor-pointer"
            >
              {redirecting === "portal" ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Abrindo portal…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ExternalLinkIcon className="size-4" />
                  Gerenciar assinatura
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Profile shortcut */}
        {user && (
          <div className="mt-8 rounded-2xl border border-border/30 bg-card/20 p-4">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-2">
              Conta
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.name ?? user.email}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </ViewTransition>
  )
}
