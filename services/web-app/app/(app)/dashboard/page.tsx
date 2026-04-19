"use client"

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  ViewTransition,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  BarChart2Icon,
  BellIcon,
  BrainIcon,
  ClockIcon,
  EyeIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useUser } from "@/hooks/use-user"
import { formatDate, useHistory, verdict, type AnalysisItem } from "@/hooks/use-history"
import { ChainChips } from "@/components/chain-chips"
import { ChainIcon } from "@/components/chain-icon"
import { ScoreBadge } from "@/components/score-badge"
import { StatusBadge } from "@/components/status-badge"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Filter = "all" | "trusted" | "risk"

const CHAIN_PALETTE: Record<string, string> = {
  ethereum: "oklch(0.60 0.17 253)",
  polygon: "oklch(0.59 0.22 295)",
  bitcoin: "oklch(0.74 0.16 85)",
  solana: "oklch(0.69 0.19 162)",
  arbitrum: "oklch(0.60 0.17 253 / 70%)",
  optimism: "oklch(0.63 0.24 28)",
  avalanche: "oklch(0.63 0.24 28)",
  outros: "oklch(0.59 0.02 230)",
}

function truncate(addr: string, head = 10, tail = 6) {
  if (addr.length <= head + tail + 1) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    let start: number | null = null
    const step = (t: number) => {
      if (start === null) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const locale = useLocale()
  const router = useRouter()
  const {
    user,
    isPro,
    firstName,
    analysisCount,
    analysisLimit,
    analysisRemaining,
    usagePct,
    limitReached,
  } = useUser()
  const { summary, data: recent, loading, refetch } = useHistory({ limit: 8 })

  const [chain, setChain] = useState("ethereum")
  const [address, setAddress] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  // Defer the loading→content swap so the View Transition can fire on the reveal.
  const deferredLoading = useDeferredValue(loading)

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    router.push(`/analyze?chain=${chain}&address=${encodeURIComponent(address.trim())}`)
  }

  function setFilterTransitioned(next: Filter) {
    startTransition(() => setFilter(next))
  }

  const filtered = useMemo(() => {
    if (filter === "all") return recent
    if (filter === "trusted") return recent.filter((r) => r.score >= 70)
    return recent.filter((r) => r.score < 40)
  }, [recent, filter])

  const topPick = useMemo<AnalysisItem | null>(() => {
    if (recent.length === 0) return null
    return [...recent].sort((a, b) => b.score - a.score)[0] ?? null
  }, [recent])

  const distribution = useMemo(() => {
    if (recent.length === 0) return [] as { chain: string; pct: number; color: string }[]
    const counts = new Map<string, number>()
    for (const r of recent) counts.set(r.chain, (counts.get(r.chain) ?? 0) + 1)
    const total = recent.length
    return [...counts.entries()]
      .map(([c, n]) => ({
        chain: c,
        pct: Math.round((n / total) * 100),
        color: CHAIN_PALETTE[c.toLowerCase()] ?? CHAIN_PALETTE.outros,
      }))
      .sort((a, b) => b.pct - a.pct)
  }, [recent])

  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date())
    } catch {
      return ""
    }
  }, [locale])

  const totalCount = useCountUp(deferredLoading ? 0 : summary.total)
  const avgCount = useCountUp(deferredLoading ? 0 : summary.avgScore)
  const trustedCount = useCountUp(deferredLoading ? 0 : summary.trusted)
  const riskyCount = useCountUp(deferredLoading ? 0 : summary.risky)

  return (
    <div className="flex flex-col">
      <Topbar
        title={t("title")}
        subtitle={t("welcome", { name: firstName })}
        showUpgrade={!isPro}
      />

      <div className="flex flex-col gap-6 px-6 pt-6 pb-12 lg:px-7">
        {/* ── Greeting block ─────────────────────────────────────────── */}
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                {dateLabel}
              </p>
              <span className="size-1 rounded-full bg-muted-foreground/40" />
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <span className="dot-pulse size-1.5 rounded-full bg-green-400" />
                {t("greeting.networksOnline", { count: 6 })}
              </span>
            </div>
            <h1 className="m-0 font-heading text-3xl font-bold tracking-wide text-foreground">
              {t("greeting.hello")},{" "}
              <span className="glow-gold text-primary">{firstName}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {recent.length === 0
                ? t("greeting.subtitleEmpty")
                : t("greeting.subtitleAlerts", { alerts: 0, recent: recent.length })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="cursor-pointer gap-1.5"
            >
              <RefreshCwIcon className="size-3.5" strokeWidth={2} />
              {t("greeting.refresh")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled
              title={t("greeting.soon")}
              className="gap-1.5 text-muted-foreground"
            >
              <ArrowRightIcon className="size-3.5" strokeWidth={2.5} />
              {t("greeting.report")}
            </Button>
          </div>
        </section>

        {/* ── Hero analyze card ──────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 80% at 100% 0%, oklch(0.74 0.19 66 / 12%), transparent 60%), radial-gradient(50% 70% at 0% 100%, oklch(0.59 0.22 295 / 10%), transparent 60%)",
            }}
          />
          <div className="relative p-6 lg:p-7">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-primary uppercase">
                    {t("analyzeCard.eyebrow")}
                  </p>
                  <span className="dot-pulse size-1.5 rounded-full bg-primary" />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {t("analyzeCard.pipeline")}
                  </span>
                </div>
                <h2 className="m-0 font-heading text-xl font-bold tracking-wide text-foreground">
                  {t("analyzeCard.title")}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-heading text-[10px] font-bold tracking-wider text-accent uppercase">
                  {isPro ? "Pro" : "Free"}
                </span>
                {analysisLimit > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {t("analyzeCard.remainingShort", {
                      remaining: analysisRemaining,
                      limit: analysisLimit,
                    })}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleAnalyze} className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[260px] flex-1">
                <SearchIcon
                  className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/60"
                  strokeWidth={2}
                />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("analyzeCard.placeholder")}
                  spellCheck={false}
                  autoComplete="off"
                  className="h-13 w-full rounded-xl border border-border bg-input pr-24 pl-11 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {t("analyzeCard.enterHint")}
                </span>
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-13 cursor-pointer gap-2 px-5"
                disabled={!address.trim()}
              >
                <BrainIcon className="size-4" strokeWidth={2.5} />
                {t("analyzeCard.submit")}
              </Button>
            </form>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="mr-1 font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                {t("analyzeCard.networkLabel")}
              </span>
              <ChainChips
                selected={chain}
                onChange={setChain}
                chains={[
                  { id: "ethereum", label: "ETH" },
                  { id: "bitcoin", label: "BTC" },
                  { id: "polygon", label: "MATIC" },
                  { id: "solana", label: "SOL" },
                  { id: "arbitrum", label: "ARB" },
                  { id: "optimism", label: "OP" },
                ]}
              />
            </div>

            {analysisLimit > 0 && (
              <div className="mt-5 flex items-center gap-4 border-t border-border pt-3.5">
                <div className="flex-1">
                  <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      {t("analyzeCard.usageMonth", {
                        count: analysisCount,
                        limit: analysisLimit,
                      })}
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        limitReached ? "text-destructive" : "text-primary",
                      )}
                    >
                      {t("analyzeCard.usagePct", { pct: Math.round(usagePct) })}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 shadow-[0_0_12px_oklch(0.74_0.19_66/50%)]"
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                </div>
                {!isPro && (
                  <Button asChild size="sm" variant="outline" className="cursor-pointer gap-1.5">
                    <Link href="/settings/billing">
                      <ZapIcon className="size-3.5" strokeWidth={2.5} />
                      {t("analyzeCard.upgrade")}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Stat tiles (suspense-style reveal via deferred loading) ── */}
        <ViewTransition enter="slide-up" default="none">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("stats.total")}
              value={totalCount}
              icon={ActivityIcon}
              color="primary"
              loading={deferredLoading}
            />
            <StatTile
              label={t("stats.avgScore")}
              value={avgCount || (deferredLoading ? 0 : 0)}
              suffix={summary.avgScore > 0 ? "/100" : ""}
              icon={BrainIcon}
              color="accent"
              loading={deferredLoading}
            />
            <StatTile
              label={t("stats.trusted")}
              value={trustedCount}
              suffix={summary.total > 0 ? `/ ${summary.total}` : ""}
              icon={ShieldCheckIcon}
              color="green"
              loading={deferredLoading}
            />
            <StatTile
              label={t("stats.risky")}
              value={riskyCount}
              suffix={summary.total > 0 ? `/ ${summary.total}` : ""}
              icon={AlertTriangleIcon}
              color="destructive"
              loading={deferredLoading}
            />
          </section>
        </ViewTransition>

        {/* ── Main 2-col grid ────────────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Recent analyses card */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <ClockIcon
                    className="size-4 text-primary/70"
                    strokeWidth={2}
                  />
                  <span className="font-heading text-[12px] font-bold tracking-[0.2em] text-foreground uppercase">
                    {t("recentAnalyses.title")}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {recent.length}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {(["all", "risk", "trusted"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilterTransitioned(f)}
                      className={cn(
                        "cursor-pointer rounded-lg border px-2.5 py-1 font-heading text-[11px] tracking-wider uppercase transition-colors",
                        filter === f
                          ? "border-primary/30 bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t(`recentAnalyses.filters.${f}`)}
                    </button>
                  ))}
                  <Button asChild variant="ghost" size="sm" className="cursor-pointer text-xs">
                    <Link href="/history">{t("recentAnalyses.viewAll")} →</Link>
                  </Button>
                </div>
              </div>

              {deferredLoading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="size-8 animate-pulse rounded-lg bg-muted/40" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-40 animate-pulse rounded bg-muted/40" />
                        <div className="h-2 w-20 animate-pulse rounded bg-muted/40" />
                      </div>
                      <div className="h-6 w-12 animate-pulse rounded-full bg-muted/40" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mb-3.5 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <SearchIcon className="size-6" strokeWidth={2} />
                  </div>
                  <p className="font-heading text-sm font-bold tracking-wider text-foreground">
                    {t("recentAnalyses.empty")}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-xs text-muted-foreground">
                    {t("recentAnalyses.emptyDesc")}
                  </p>
                </div>
              ) : (
                // Filter swap → cross-fade via key change inside startTransition.
                <ViewTransition key={filter} enter="slide-up" default="none">
                  <ul className="divide-y divide-border">
                    {filtered.slice(0, 5).map((item) => (
                      // List identity: animate reorder.
                      <ViewTransition key={item.id}>
                        <li>
                          <Link
                            href={`/analyze?chain=${item.chain}&address=${item.address}`}
                            className="grid grid-cols-[36px_1fr_auto_auto_16px] items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-foreground/[0.04]"
                          >
                            <ChainIcon chain={item.chain} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xs text-foreground/80">
                                {truncate(item.address, 12, 6)}
                              </p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {formatDate(item.completedAt)}
                              </p>
                            </div>
                            {/* Shared element morph into /analyze (peer not yet wired). */}
                            <ViewTransition name={`recent-score-${item.id}`} share="auto">
                              <ScoreBadge score={item.score} />
                            </ViewTransition>
                            <StatusBadge
                              verdict={
                                verdict(item.score) === "Confiável"
                                  ? "trusted"
                                  : verdict(item.score) === "Atenção"
                                    ? "attention"
                                    : "risk"
                              }
                              pulse={false}
                            />
                            <ArrowRightIcon
                              className="size-4 text-muted-foreground/50"
                              strokeWidth={2}
                            />
                          </Link>
                        </li>
                      </ViewTransition>
                    ))}
                  </ul>
                </ViewTransition>
              )}
            </div>

            {/* Highlight + distribution row */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-primary uppercase">
                    {t("highlight.eyebrow")}
                  </p>
                  <EyeIcon className="size-3.5 text-primary/70" strokeWidth={2} />
                </div>
                <p className="mb-4 font-heading text-base font-bold tracking-wide text-foreground">
                  {t("highlight.title")}
                </p>
                {topPick ? (
                  <Link
                    href={`/analyze?chain=${topPick.chain}&address=${topPick.address}`}
                    className="flex items-center gap-4"
                  >
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 font-heading text-2xl font-bold text-primary">
                      {topPick.score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-foreground/80">
                        {truncate(topPick.address, 10, 6)}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDate(topPick.completedAt)}
                      </p>
                      <span className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {topPick.chain}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("highlight.empty")}</p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3.5 flex items-center justify-between">
                  <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                    {t("distribution.eyebrow")}
                  </p>
                  {recent.length > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {t("distribution.sample", { n: recent.length })}
                    </span>
                  )}
                </div>
                {distribution.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("distribution.empty")}</p>
                ) : (
                  <>
                    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                      {distribution.map((d) => (
                        <div
                          key={d.chain}
                          style={{
                            width: `${d.pct}%`,
                            background: d.color,
                            boxShadow: `inset 0 0 6px ${d.color}`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-3.5 grid grid-cols-2 gap-2">
                      {distribution.map((d) => (
                        <div
                          key={d.chain}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <span
                            className="size-2 rounded-sm"
                            style={{ background: d.color }}
                          />
                          <span className="flex-1 font-heading text-[9px] tracking-wider text-muted-foreground uppercase">
                            {d.chain}
                          </span>
                          <span className="font-mono text-[11px] text-foreground">
                            {d.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar: alerts + watchlist (placeholders) */}
          <aside className="flex flex-col gap-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <BellIcon className="size-3.5 text-primary" strokeWidth={2} />
                <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                  {t("alerts.eyebrow")}
                </p>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent uppercase">
                  {t("greeting.soon")}
                </span>
              </div>
              <p className="mb-1 text-[13px] font-semibold text-foreground">
                {t("alerts.soonTitle")}
              </p>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                {t("alerts.soonBody")}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <BarChart2Icon className="size-3.5 text-accent" strokeWidth={2} />
                <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                  {t("watchlist.eyebrow")}
                </p>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent uppercase">
                  {t("greeting.soon")}
                </span>
              </div>
              <p className="mb-1 text-[13px] font-semibold text-foreground">
                {t("watchlist.soonTitle")}
              </p>
              <p className="mb-4 text-[11.5px] leading-relaxed text-muted-foreground">
                {t("watchlist.soonBody")}
              </p>
              <Button
                disabled
                size="sm"
                variant="outline"
                className="w-full cursor-not-allowed text-muted-foreground"
              >
                {t("watchlist.addCta")}
              </Button>
            </div>

            {user && (
              <div className="rounded-2xl border border-border/40 bg-card/40 px-5 py-4">
                <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  {user.email}
                </p>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {user.name ?? firstName}
                </p>
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  )
}

interface StatTileProps {
  label: string
  value: number
  suffix?: string
  icon: React.ElementType
  color: "primary" | "accent" | "green" | "destructive"
  loading?: boolean
}

function StatTile({ label, value, suffix, icon: Icon, color, loading }: StatTileProps) {
  const palette = {
    primary: { tile: "bg-primary/10 text-primary", text: "text-primary" },
    accent: { tile: "bg-accent/10 text-accent", text: "text-accent" },
    green: { tile: "bg-green-500/10 text-green-400", text: "text-green-400" },
    destructive: {
      tile: "bg-destructive/10 text-destructive",
      text: "text-destructive",
    },
  }[color]

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
          {label}
        </p>
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            palette.tile,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-heading text-3xl leading-none font-bold tabular-nums",
            palette.text,
          )}
        >
          {loading ? "—" : value}
        </span>
        {suffix && !loading && (
          <span className="font-mono text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
      <div className="mt-2.5 h-3 text-[10px] text-muted-foreground">{/* delta slot — no time-series yet */}</div>
    </div>
  )
}
