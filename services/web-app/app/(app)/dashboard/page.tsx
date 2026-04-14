"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ActivityIcon,
  BarChart2Icon,
  ClockIcon,
  SearchIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useUser } from "@/hooks/use-user"
import { formatDate, useHistory } from "@/hooks/use-history"
import { ChainChips } from "@/components/chain-chips"
import { StatCard } from "@/components/stat-card"
import { ScoreBadge } from "@/components/score-badge"
import { ChainIcon } from "@/components/chain-icon"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"

function truncate(addr: string) {
  if (addr.length <= 18) return addr
  return `${addr.slice(0, 10)}...${addr.slice(-6)}`
}

export default function DashboardPage() {
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
  const { summary, data: recentAnalyses, loading: historyLoading } = useHistory({ limit: 3 })
  const router = useRouter()
  const t = useTranslations("dashboard")
  const [chain, setChain] = useState("ethereum")
  const [address, setAddress] = useState("")

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    router.push(`/analyze?chain=${chain}&address=${encodeURIComponent(address.trim())}`)
  }

  return (
    <div className="flex flex-col">
      <Topbar
        title={t("title")}
        subtitle={t("welcome", { name: firstName })}
        showUpgrade={!isPro}
      />

      <div className="flex flex-col gap-8 p-6">
        {/* Search hero */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 font-heading text-sm font-bold tracking-wider text-foreground">
            {t("analyzeCard.title")}
          </p>
          <form onSubmit={handleAnalyze} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" strokeWidth={1.75} />
              <input
                type="text"
                placeholder={t("analyzeCard.placeholder")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <ChainChips
              selected={chain}
              onChange={setChain}
              chains={[
                { id: "ethereum", label: "ETH" },
                { id: "bitcoin", label: "BTC" },
                { id: "polygon", label: "MATIC" },
                { id: "solana", label: "SOL" },
              ]}
            />
            <Button type="submit" className="h-11 cursor-pointer shrink-0 gap-2">
              <SearchIcon className="size-4" strokeWidth={2.5} />
              {t("analyzeCard.submit")}
            </Button>
          </form>

          {/* Usage bar */}
          {user && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("analyzeCard.usageMonth", { count: analysisCount, limit: analysisLimit })}</span>
                <span className={limitReached ? "text-destructive" : "text-primary"}>
                  {t("analyzeCard.usageRemaining", { remaining: analysisRemaining })}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("stats.total")}    value={analysisCount}                                                    icon={ActivityIcon} />
          <StatCard label={t("stats.remaining")} value={analysisRemaining}                                               icon={ZapIcon} />
          <StatCard label={t("stats.plan")}      value={isPro ? "Pro" : "Free"}                                          icon={ShieldCheckIcon} />
          <StatCard label={t("stats.avgScore")}  value={historyLoading ? "—" : (summary.avgScore > 0 ? summary.avgScore : "—")} icon={BarChart2Icon} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Recent analyses */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-primary/70" strokeWidth={1.75} />
                <span className="font-heading text-sm font-semibold tracking-wider">{t("recentAnalyses.title")}</span>
              </div>
              <Button variant="ghost" size="sm" className="cursor-pointer text-xs" asChild>
                <a href="/history">{t("recentAnalyses.viewAll")}</a>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {historyLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="size-7 animate-pulse rounded-full bg-muted/40" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-32 animate-pulse rounded bg-muted/40" />
                      <div className="h-2 w-16 animate-pulse rounded bg-muted/40" />
                    </div>
                    <div className="h-5 w-10 animate-pulse rounded-full bg-muted/40" />
                  </div>
                ))
              ) : recentAnalyses.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {t("recentAnalyses.empty")}
                </div>
              ) : (
                recentAnalyses.map((item) => (
                  <a
                    key={item.id}
                    href={`/analyze?chain=${item.chain}&address=${item.address}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/3"
                  >
                    <ChainIcon chain={item.chain} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-foreground/80">
                        {truncate(item.address)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDate(item.completedAt)}
                      </p>
                    </div>
                    <ScoreBadge score={item.score} />
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-3">
            <p className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {t("quickActions.title")}
            </p>
            {[
              {
                href: "/analyze",
                icon: SearchIcon,
                title: t("quickActions.newAnalysis.title"),
                desc: t("quickActions.newAnalysis.desc"),
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                href: "/history",
                icon: ClockIcon,
                title: t("quickActions.history.title"),
                desc: t("quickActions.history.desc"),
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                href: "/settings/billing",
                icon: ZapIcon,
                title: t("quickActions.upgrade.title"),
                desc: t("quickActions.upgrade.desc"),
                color: "text-green-400",
                bg: "bg-green-400/10",
              },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-white/10"
              >
                <div className={`flex size-10 items-center justify-center rounded-xl ${action.bg}`}>
                  <action.icon className={`size-4 ${action.color}`} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
