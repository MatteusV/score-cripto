"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  CompassIcon,
  SearchIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  useExplore,
  type ExploreRecent,
  type ExploreWallet,
} from "@/hooks/use-explore"

const CATEGORY_IDS = [
  "exchange",
  "defi",
  "mixer",
  "sanctions",
  "bridge",
  "nft",
  "stablecoin",
  "whale",
] as const

const CATEGORY_ICONS: Record<(typeof CATEGORY_IDS)[number], string> = {
  exchange: "💳",
  defi: "🧠",
  mixer: "⚡",
  sanctions: "🚨",
  bridge: "→",
  nft: "🧭",
  stablecoin: "🛡️",
  whale: "💼",
}

const TAGS = ["Tornado Cash", "Binance", "Coinbase", "Lido", "Uniswap v4", "Aave", "Curve"]

type Verdict = "trusted" | "attention" | "risk"

function verdictOf(score: number): Verdict {
  if (score >= 70) return "trusted"
  if (score >= 40) return "attention"
  return "risk"
}

function truncate(addr: string, chars = 6) {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 60
  const h = 22
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" L")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function VerdictBadge({ verdict, label }: { verdict: Verdict; label: string }) {
  const config = {
    trusted: { bg: "bg-green-500/10", text: "text-green-600" },
    attention: { bg: "bg-amber-500/10", text: "text-amber-600" },
    risk: { bg: "bg-red-500/10", text: "text-red-600" },
  }
  const cfg = config[verdict]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {label}
    </span>
  )
}

function formatRelative(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 60) return rtf.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (hours < 24) return rtf.format(-hours, "hour")
  const days = Math.round(hours / 24)
  return rtf.format(-days, "day")
}

export default function SearchPage() {
  const t = useTranslations("explore")
  const router = useRouter()
  const [q, setQ] = useState("")
  const [tab, setTab] = useState<"trending" | "risk" | "leaderboard">("trending")
  const [chainFilter, setChainFilter] = useState("all")

  const [activeQuery, setActiveQuery] = useState("")

  const { data, loading, error } = useExplore()

  const matchesQuery = (w: ExploreWallet, query: string) => {
    if (!query) return true
    const needle = query.toLowerCase().trim()
    return (
      w.address.toLowerCase().includes(needle) ||
      w.chain.toLowerCase().includes(needle) ||
      (w.reasoning ?? "").toLowerCase().includes(needle) ||
      w.riskFactors.some((f) => f.toLowerCase().includes(needle))
    )
  }

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of data.categories) m.set(c.id, c.count)
    return m
  }, [data.categories])

  const categoriesTotal = useMemo(
    () => data.categories.reduce((s, c) => s + c.count, 0),
    [data.categories],
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setActiveQuery(q.trim())
  }

  function handleTagClick(tag: string) {
    setQ(tag)
    setActiveQuery(tag)
  }

  function handleClearQuery() {
    setQ("")
    setActiveQuery("")
  }

  function handleWalletClick(w: ExploreWallet) {
    router.push(`/analyze?chain=${w.chain}&address=${encodeURIComponent(w.address)}`)
  }

  function handleRecentClick(r: ExploreRecent) {
    router.push(`/analysis/${r.id}`)
  }

  const trendingFiltered = data.trending
    .filter((w) => chainFilter === "all" || w.chain === chainFilter)
    .filter((w) => matchesQuery(w, activeQuery))

  const riskFiltered = data.risk.filter((w) => matchesQuery(w, activeQuery))
  const leaderboardFiltered = data.leaderboard.filter((w) => matchesQuery(w, activeQuery))

  const availableChains = useMemo(
    () => Array.from(new Set(data.trending.map((w) => w.chain))).slice(0, 4),
    [data.trending],
  )

  return (
    <div className="flex flex-col">
      <Topbar title={t("title")} subtitle={t("subtitle")} />

      <div className="flex flex-col gap-8 p-7">
        {/* Hero section */}
        <div className="relative rounded-3xl border border-border/50 bg-gradient-to-b from-card to-card/50 p-9 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-primary/8 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                <CompassIcon className="w-4 h-4" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-accent">
                {t("hero.eyebrow")}
              </span>
            </div>

            <h1 className="text-3xl font-heading font-bold mb-2 leading-tight">
              {t("hero.heading")} <span className="text-accent">{t("hero.headingHighlight")}</span> {t("hero.headingRest")}
            </h1>

            <p className="text-sm text-muted-foreground mb-6 max-w-2xl leading-relaxed">
              {t("hero.description", {
                count: data.stats.uniqueAddresses.toLocaleString(),
                chains: data.stats.chains || 7,
              })}
            </p>

            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div className="relative flex gap-3 mb-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-border bg-muted/50 pl-14 pr-36 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-1">⌘ K</span>
                    <Button type="submit" variant="default" size="sm" className="gap-1">
                      <ArrowRightIcon className="w-4 h-4" />
                      {t("hero.searchCta")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-heading uppercase tracking-[0.3em] text-muted-foreground">
                  {t("hero.suggested")}
                </span>
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="px-3 py-1.5 rounded-full border border-border bg-transparent text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>

            <div className="grid grid-cols-4 gap-6 mt-8 pt-8 border-t border-border/50">
              {[
                { value: data.stats.uniqueAddresses.toLocaleString(), label: t("stats.indexed"), color: "text-primary" },
                { value: String(data.stats.chains || 0), label: t("stats.chains"), color: "text-accent" },
                { value: data.stats.risky.toLocaleString(), label: t("stats.risky"), color: "text-destructive" },
                { value: "24h", label: t("stats.refresh"), color: "text-green-500" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className={`font-heading font-bold text-2xl ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("categoriesLabel")}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {t("categoriesTotal", { total: categoriesTotal.toLocaleString() })}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className="relative text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:-translate-y-0.5 transition-all group overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg">{CATEGORY_ICONS[id]}</span>
                    <span className="font-heading font-bold text-lg text-primary">
                      {(categoryCounts.get(id) ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="font-semibold text-sm mb-1">{t(`categories.${id}.label`)}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{t(`categories.${id}.desc`)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {activeQuery && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <SearchIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
              <span>
                {t("activeFilter")}: <span className="font-mono font-semibold text-primary">{activeQuery}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearQuery}
              className="text-xs text-muted-foreground hover:text-foreground font-heading uppercase tracking-wide"
            >
              {t("clearFilter")}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {t("error")}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
                {(["trending", "risk", "leaderboard"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      tab === id
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`tabs.${id}`)}
                  </button>
                ))}
              </div>

              {tab === "trending" && availableChains.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChainFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                      chainFilter === "all"
                        ? "bg-primary/20 border border-primary/50 text-primary"
                        : "border border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {t("chainFilter.all")}
                  </button>
                  {availableChains.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChainFilter(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                        chainFilter === c
                          ? "bg-primary/20 border border-primary/50 text-primary"
                          : "border border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trending */}
            {tab === "trending" && (
              <div className="space-y-3">
                {loading && <Card className="p-6 text-sm text-muted-foreground">{t("loading")}</Card>}
                {!loading && trendingFiltered.length === 0 && (
                  <Card className="p-6 text-sm text-muted-foreground">
                    {activeQuery ? t("noMatches") : t("trending.empty")}
                  </Card>
                )}
                {trendingFiltered.map((item, i) => {
                  const verdict = verdictOf(item.score)
                  return (
                    <Card
                      key={`${item.chain}:${item.address}`}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleWalletClick(item)}
                    >
                      <div className="grid grid-cols-[28px_44px_1fr_140px_110px_auto] gap-3 items-center">
                        <span className="font-heading font-bold text-sm text-muted-foreground text-center">#{i + 1}</span>
                        <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[10px] font-heading font-bold">
                          {item.chain.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold font-mono">{truncate(item.address)}</span>
                            <VerdictBadge verdict={verdict} label={t(`verdict.${verdict}`)} />
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{item.reasoning ?? "—"}</div>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <Sparkline
                            values={Array.from({ length: 12 }, (_, x) => Math.sin(i + x * 0.6) * 10 + item.score)}
                            color="var(--primary)"
                          />
                          <div>
                            <div className="font-heading font-bold text-lg text-primary">{item.score}</div>
                            <div className="text-[9px] text-muted-foreground">{t("trending.scoreLabel")}</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          <div className="text-foreground font-bold text-sm">{item.lookups}</div>
                          <div className="text-[9px]">{t("trending.lookupsLabel")}</div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1">
                          <ArrowRightIcon className="w-3 h-3" />
                          {t("trending.view")}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Risk list */}
            {tab === "risk" && (
              <Card className="overflow-hidden">
                <div className="bg-destructive/10 border-b border-destructive/30 px-5 py-3 flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-destructive" strokeWidth={2} />
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-destructive">
                    {t("risk.heading")}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {loading && <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>}
                  {!loading && riskFiltered.length === 0 && (
                    <div className="p-6 text-sm text-muted-foreground">{t("risk.empty")}</div>
                  )}
                  {riskFiltered.map((item) => (
                    <div
                      key={`${item.chain}:${item.address}`}
                      className="grid grid-cols-[44px_52px_1fr_auto_auto] gap-4 p-4 items-center hover:bg-muted/30 transition-colors"
                    >
                      <div className="font-heading font-bold text-2xl text-destructive text-center">{item.score}</div>
                      <div className="w-9 h-9 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center text-[9px] font-heading font-bold">
                        {item.chain.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm font-mono">{truncate(item.address)}</span>
                          <span className="text-[10px] border border-destructive/50 bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            {t("risk.highRisk")}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {item.riskFactors.length > 0 ? item.riskFactors.slice(0, 2).join(" · ") : (item.reasoning ?? "—")}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">{t("risk.report")}</Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleWalletClick(item)}>
                        <ArrowRightIcon className="w-3 h-3" />
                        {t("risk.investigate")}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Leaderboard */}
            {tab === "leaderboard" && (
              <Card className="overflow-hidden">
                <div className="bg-green-500/10 border-b border-green-500/30 px-5 py-3 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-green-600" strokeWidth={2} />
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-green-600">
                    {t("leaderboard.heading")}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {loading && <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>}
                  {!loading && leaderboardFiltered.length === 0 && (
                    <div className="p-6 text-sm text-muted-foreground">{t("leaderboard.empty")}</div>
                  )}
                  {leaderboardFiltered.map((item, idx) => (
                    <div
                      key={`${item.chain}:${item.address}`}
                      className="grid grid-cols-[48px_52px_1fr_200px_80px_auto] gap-4 p-4 items-center hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {idx < 3 && <span className="text-lg">{"🥇🥈🥉"[idx]}</span>}
                        <span className="font-heading font-bold text-sm text-muted-foreground">#{idx + 1}</span>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center text-[9px] font-heading font-bold">
                        {item.chain.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold font-mono">{truncate(item.address)}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1 truncate">{item.reasoning ?? "—"}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.confidence !== null
                          ? `conf. ${Math.round(item.confidence * 100)}%`
                          : "—"}
                      </div>
                      <div className="font-heading font-bold text-xl text-green-600">{item.score}</div>
                      <Button variant="outline" size="sm" onClick={() => handleWalletClick(item)}>
                        {t("leaderboard.details")}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground">
                  {t("sidebar.recentTitle")}
                </span>
              </div>
              <div className="space-y-2">
                {data.recent.length === 0 && (
                  <div className="text-xs text-muted-foreground">{t("sidebar.recentEmpty")}</div>
                )}
                {data.recent.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRecentClick(r)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <SearchIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate font-mono">{truncate(r.address)}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {r.chain} · {formatRelative(r.requestedAt, "pt-BR")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {data.recent.length > 0 && (
                <button type="button" className="mt-3 text-xs text-muted-foreground hover:text-foreground font-heading tracking-wide uppercase">
                  {t("sidebar.recentClear")}
                </button>
              )}
            </Card>

            <Card className="p-4 backdrop-blur">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground block mb-4">
                {t("sidebar.chainDistribution")}
              </span>
              <div className="space-y-4">
                {data.chainDistribution.length === 0 && (
                  <div className="text-xs text-muted-foreground">—</div>
                )}
                {data.chainDistribution.map((chain) => (
                  <div key={chain.chain}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-foreground capitalize">{chain.chain}</span>
                      <span className="text-muted-foreground font-mono">{chain.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary/80 to-primary/40" style={{ width: `${chain.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <ZapIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-primary">
                  {t("sidebar.proEyebrow")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {t("sidebar.proDescription")}
              </p>
              <Button variant="default" size="sm" className="w-full gap-1">
                <ArrowRightIcon className="w-3 h-3" />
                {t("sidebar.proCta")}
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
