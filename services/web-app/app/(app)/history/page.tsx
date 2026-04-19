"use client"

import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
  ViewTransition,
} from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CopyIcon,
  DownloadIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { ChainIcon } from "@/components/chain-icon"
import { StatusBadge } from "@/components/status-badge"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { formatDate, useHistory, type AnalysisItem } from "@/hooks/use-history"
import { cn } from "@/lib/utils"

type VerdictFilter = "all" | "trusted" | "attention" | "risk"
type RangeFilter = "7d" | "30d" | "all"
type SortKey = "recent" | "score-high" | "score-low" | "risk"

const CHAINS = [
  "ethereum",
  "bitcoin",
  "polygon",
  "solana",
  "arbitrum",
  "optimism",
  "avalanche",
] as const

function truncate(addr: string, head = 8, tail = 6) {
  if (addr.length <= head + tail + 1) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--primary)"
  if (score >= 40) return "var(--amber)"
  return "var(--destructive)"
}

function scoreVerdict(score: number): "trusted" | "attention" | "risk" {
  if (score >= 70) return "trusted"
  if (score >= 40) return "attention"
  return "risk"
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Infinity
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24))
}

export default function HistoryPage() {
  const t = useTranslations("history")
  const { summary, data, loading } = useHistory({ limit: 100 })

  const [query, setQuery] = useState("")
  const [verdict, setVerdict] = useState<VerdictFilter>("all")
  const [chain, setChain] = useState<string>("all")
  const [range, setRange] = useState<RangeFilter>("30d")
  const [sort, setSort] = useState<SortKey>("recent")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const deferredLoading = useDeferredValue(loading)

  // Counts driven by real data, not mock pools.
  const verdictCounts = useMemo(() => {
    const out = { trusted: 0, attention: 0, risk: 0 }
    for (const r of data) out[scoreVerdict(r.score)]++
    return out
  }, [data])

  const chainCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const r of data) out[r.chain] = (out[r.chain] ?? 0) + 1
    return out
  }, [data])

  const filtered = useMemo(() => {
    let out = data.filter((r) => {
      if (verdict !== "all" && scoreVerdict(r.score) !== verdict) return false
      if (chain !== "all" && r.chain !== chain) return false
      if (range !== "all") {
        const days = daysSince(r.completedAt)
        const limit = range === "7d" ? 7 : 30
        if (days > limit) return false
      }
      if (query.trim()) {
        const q = query.toLowerCase()
        if (
          !r.address.toLowerCase().includes(q) &&
          !r.id.toLowerCase().includes(q) &&
          !(r.publicId ? String(r.publicId).includes(q) : false)
        )
          return false
      }
      return true
    })
    if (sort === "score-high") out = [...out].sort((a, b) => b.score - a.score)
    else if (sort === "score-low" || sort === "risk")
      out = [...out].sort((a, b) => a.score - b.score)
    return out
  }, [data, verdict, chain, range, query, sort])

  function toggleExpand(id: string) {
    startTransition(() => {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    })
  }

  function clearAll() {
    startTransition(() => {
      setQuery("")
      setVerdict("all")
      setChain("all")
      setRange("all")
    })
  }

  async function handleCopy(addr: string, id: string) {
    try {
      await navigator.clipboard.writeText(addr)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      /* noop */
    }
  }

  const hasActive =
    !!query || verdict !== "all" || chain !== "all" || range !== "all"

  const verdictTabs: {
    key: VerdictFilter
    label: string
    count: number
    color: string
  }[] = [
    {
      key: "all",
      label: t("verdict.all"),
      count: data.length,
      color: "var(--foreground)",
    },
    {
      key: "trusted",
      label: t("verdict.trusted"),
      count: verdictCounts.trusted,
      color: "var(--green)",
    },
    {
      key: "attention",
      label: t("verdict.attention"),
      count: verdictCounts.attention,
      color: "var(--amber)",
    },
    {
      key: "risk",
      label: t("verdict.risky"),
      count: verdictCounts.risk,
      color: "var(--destructive)",
    },
  ]

  return (
    <div className="flex flex-col">
      <Topbar title={t("title")} subtitle={t("subtitle")} />

      <div className="flex flex-col gap-5 px-6 pt-6 pb-12 lg:px-7">
        {/* ── Header block ────────────────────────────────────────────── */}
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 font-heading text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
              {t("header.eyebrow")}
            </p>
            <h1 className="m-0 font-heading text-3xl font-bold tracking-wide text-foreground">
              <span className="text-primary tabular-nums">
                {deferredLoading ? "—" : summary.total}
              </span>{" "}
              {t("header.countAnalyses", { count: summary.total }).replace(
                /^\d+\s*/,
                "",
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              title={t("header.soon")}
              className="cursor-not-allowed gap-1.5 text-muted-foreground"
            >
              <DownloadIcon className="size-3.5" strokeWidth={2} />
              {t("header.exportCsv")}
            </Button>
            <Button asChild size="sm" className="cursor-pointer gap-1.5">
              <Link href="/analyze">
                <SearchIcon className="size-3.5" strokeWidth={2.5} />
                {t("header.newAnalysis")}
              </Link>
            </Button>
          </div>
        </section>

        {/* ── Verdict tabs ────────────────────────────────────────────── */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {verdictTabs.map((v) => {
            const active = verdict === v.key
            const pct =
              data.length > 0 ? Math.round((v.count / data.length) * 100) : 0
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => startTransition(() => setVerdict(v.key))}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-primary/30 bg-primary/[0.06] shadow-[inset_0_0_20px_oklch(0.74_0.19_66/12%)]"
                    : "border-border bg-card hover:border-foreground/15",
                )}
              >
                <p
                  className={cn(
                    "font-heading text-[10px] font-bold tracking-[0.3em] uppercase",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {v.label}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span
                    className="font-heading text-2xl leading-none font-bold tabular-nums"
                    style={{ color: v.color }}
                  >
                    {deferredLoading ? "—" : v.count}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {deferredLoading ? "" : `${pct}%`}
                  </span>
                </div>
              </button>
            )
          })}
        </section>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/80 p-3.5 backdrop-blur-xl">
          <div className="relative min-w-[260px] flex-1">
            <SearchIcon
              className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-border bg-input px-9 font-mono text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              spellCheck={false}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-3 flex size-4.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3" strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-heading text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
              {t("filters.chainLabel")}
            </span>
            <select
              value={chain}
              onChange={(e) => startTransition(() => setChain(e.target.value))}
              className="h-8 cursor-pointer rounded-lg border border-border bg-input px-2.5 font-mono text-[11px] text-foreground"
            >
              <option value="all">{t("filters.allChains")}</option>
              {CHAINS.map((c) => (
                <option key={c} value={c}>
                  {c} ({chainCounts[c] ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-0.5 rounded-lg border border-border bg-muted p-0.5">
            {(["7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => startTransition(() => setRange(r))}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1 font-heading text-[10px] font-bold tracking-wider uppercase transition-colors",
                  range === r
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "7d"
                  ? t("filters.range7d")
                  : r === "30d"
                    ? t("filters.range30d")
                    : t("filters.rangeAll")}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="font-heading text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
              {t("filters.sortLabel")}
            </span>
            <select
              value={sort}
              onChange={(e) =>
                startTransition(() => setSort(e.target.value as SortKey))
              }
              className="h-8 cursor-pointer rounded-lg border border-border bg-input px-2.5 font-mono text-[11px] text-foreground"
            >
              <option value="recent">{t("filters.sortRecent")}</option>
              <option value="score-high">{t("filters.sortScoreHigh")}</option>
              <option value="score-low">{t("filters.sortScoreLow")}</option>
              <option value="risk">{t("filters.sortRisk")}</option>
            </select>
          </div>
        </section>

        {/* ── Active filters strip ───────────────────────────────────── */}
        {hasActive && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-[10px] font-bold tracking-[0.25em] text-muted-foreground uppercase">
              {t("active.label")}
            </span>
            {query && (
              <ActiveChip onClear={() => setQuery("")}>“{query}”</ActiveChip>
            )}
            {verdict !== "all" && (
              <ActiveChip onClear={() => setVerdict("all")}>
                {t(`verdict.${verdict === "risk" ? "risky" : verdict}`)}
              </ActiveChip>
            )}
            {chain !== "all" && (
              <ActiveChip onClear={() => setChain("all")}>{chain}</ActiveChip>
            )}
            {range !== "all" && (
              <ActiveChip onClear={() => setRange("all")}>
                {range === "7d"
                  ? t("filters.range7d")
                  : t("filters.range30d")}
              </ActiveChip>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 cursor-pointer font-heading text-[10px] font-bold tracking-[0.25em] text-primary uppercase"
            >
              {t("active.clearAll")}
            </button>
          </div>
        )}

        {/* ── Table ──────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* Column header */}
          <div
            className="grid items-center gap-3 border-b border-border px-4 py-3 font-heading text-[9px] font-bold tracking-[0.25em] text-muted-foreground uppercase"
            style={{
              gridTemplateColumns:
                "44px minmax(0,1.6fr) 100px minmax(0,1fr) 110px 110px 60px",
              background: "color-mix(in oklab, var(--card-2), transparent 40%)",
            }}
          >
            <span>{t("columns.chain")}</span>
            <span>{t("columns.wallet")}</span>
            <span>{t("columns.score")}</span>
            <span></span>
            <span>{t("columns.verdict")}</span>
            <span>{t("columns.date")}</span>
            <span className="text-right">{t("columns.id")}</span>
          </div>

          {deferredLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3 px-4 py-3.5"
                  style={{
                    gridTemplateColumns:
                      "44px minmax(0,1.6fr) 100px minmax(0,1fr) 110px 110px 60px",
                  }}
                >
                  <div className="size-8 animate-pulse rounded-lg bg-muted/40" />
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-48 animate-pulse rounded bg-muted/40" />
                    <div className="h-2 w-32 animate-pulse rounded bg-muted/40" />
                  </div>
                  <div className="h-5 w-12 animate-pulse rounded bg-muted/40" />
                  <div className="h-1 animate-pulse rounded-full bg-muted/40" />
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted/40" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted/40" />
                  <div />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <SearchIcon className="size-6" strokeWidth={2} />
              </div>
              <p className="font-heading text-sm font-bold tracking-wider text-foreground">
                {data.length === 0 ? t("empty") : t("noFilter")}
              </p>
            </div>
          ) : (
            <ViewTransition
              key={`${verdict}-${chain}-${range}-${sort}`}
              enter="slide-up"
              default="none"
            >
              <ul>
                {filtered.map((row) => (
                  <ViewTransition key={row.id}>
                    <li>
                      <HistoryRow
                        row={row}
                        expanded={expanded.has(row.id)}
                        onToggle={() => toggleExpand(row.id)}
                        copiedId={copiedId}
                        onCopy={handleCopy}
                        t={t}
                      />
                    </li>
                  </ViewTransition>
                ))}
              </ul>
            </ViewTransition>
          )}

          {/* Footer */}
          {!deferredLoading && filtered.length > 0 && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
              style={{
                background:
                  "color-mix(in oklab, var(--card-2), transparent 60%)",
              }}
            >
              <p className="font-mono text-[11px] text-muted-foreground">
                {t("showing", {
                  filtered: filtered.length,
                  total: summary.total,
                })}
              </p>
              {/* Pagination is decorative for now — useHistory limit=100 covers
                  the v1 scope; wire to real `pagination` when paging is needed. */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="cursor-not-allowed text-muted-foreground"
                >
                  {t("pagination.prev")}
                </Button>
                <span className="flex size-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 font-mono text-[11px] font-bold text-primary">
                  1
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="cursor-not-allowed text-muted-foreground"
                >
                  {t("pagination.next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActiveChip({
  children,
  onClear,
}: {
  children: React.ReactNode
  onClear: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-foreground">
      {children}
      <button
        type="button"
        onClick={onClear}
        className="flex size-3.5 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="Remove filter"
      >
        <XIcon className="size-2.5" strokeWidth={2.5} />
      </button>
    </span>
  )
}

interface HistoryRowProps {
  row: AnalysisItem
  expanded: boolean
  onToggle: () => void
  copiedId: string | null
  onCopy: (addr: string, id: string) => void
  t: ReturnType<typeof useTranslations<"history">>
}

function HistoryRow({
  row,
  expanded,
  onToggle,
  copiedId,
  onCopy,
  t,
}: HistoryRowProps) {
  const color = scoreColor(row.score)
  const v = scoreVerdict(row.score)
  const idLabel = row.publicId
    ? `#${String(row.publicId).padStart(5, "0")}`
    : row.id.slice(0, 8)
  const analyzeHref = row.publicId
    ? `/analyze?id=${row.publicId}`
    : `/analyze?chain=${row.chain}&address=${row.address}`

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "grid w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
          expanded
            ? "border-b border-transparent bg-primary/[0.05]"
            : "border-b border-border hover:bg-foreground/[0.04]",
        )}
        style={{
          gridTemplateColumns:
            "44px minmax(0,1.6fr) 100px minmax(0,1fr) 110px 110px 60px",
        }}
      >
        <ChainIcon chain={row.chain} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {truncate(row.address, 10, 6)}
          </p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {row.address}
          </p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-heading text-xl leading-none font-bold tabular-nums"
            style={{ color }}
          >
            {row.score}
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">
            /100
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${row.score}%`,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        </div>
        <StatusBadge verdict={v} pulse={false} />
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatDate(row.completedAt)}
        </span>
        <div className="flex items-center justify-end gap-1">
          <span className="font-mono text-[10px] text-muted-foreground">
            {idLabel}
          </span>
          <ArrowRightIcon
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              expanded && "rotate-90",
            )}
            strokeWidth={2}
          />
        </div>
      </button>

      {expanded && (
        <ViewTransition enter="slide-up" exit="slide-up" default="none">
          <div
            className="grid gap-3 border-b border-border px-4 py-4 lg:grid-cols-[1.4fr_1fr]"
            style={{
              background: "color-mix(in oklab, var(--primary), transparent 94%)",
            }}
          >
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <p className="mb-2 font-heading text-[9px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                {t("expand.reasoningTitle")}
              </p>
              <p className="text-[12.5px] leading-relaxed text-foreground/90">
                {t("expand.reasoningDesc")}
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-4">
              <p className="mb-1 font-heading text-[9px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                {t("expand.actionsTitle")}
              </p>
              <Button
                asChild
                size="sm"
                className="cursor-pointer justify-start gap-2"
              >
                <Link href={analyzeHref}>
                  <SearchIcon className="size-3.5" strokeWidth={2.5} />
                  {t("expand.viewFull")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="cursor-pointer justify-start gap-2"
              >
                <Link href={`${analyzeHref}&recalc=1`}>
                  <RefreshCwIcon className="size-3.5" strokeWidth={2} />
                  {t("expand.recalculate")}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopy(row.address, row.id)}
                className="cursor-pointer justify-start gap-2"
              >
                <CopyIcon className="size-3.5" strokeWidth={2} />
                {copiedId === row.id ? t("expand.copied") : t("expand.copy")}
              </Button>
            </div>
          </div>
        </ViewTransition>
      )}
    </>
  )
}
