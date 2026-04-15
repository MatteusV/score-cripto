"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ActivityIcon,
  ClockIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { ChainChips } from "@/components/chain-chips"
import { ChainIcon } from "@/components/chain-icon"
import { ScoreBadge } from "@/components/score-badge"
import { Topbar } from "@/components/topbar"
import { useSearch, type WalletHit } from "@/hooks/use-search"

const CHAINS = [
  { id: "", label: "Todas" },
  { id: "ethereum", label: "ETH" },
  { id: "polygon", label: "POL" },
  { id: "arbitrum", label: "ARB" },
  { id: "optimism", label: "OP" },
  { id: "base", label: "BASE" },
  { id: "bsc", label: "BSC" },
]

function truncate(addr: string) {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_80px_100px_100px_120px] items-center gap-4 px-5 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-muted/40" style={{ width: `${[140, 40, 56, 60, 80][i]}px` }} />
      ))}
    </div>
  )
}

function RiskBadge({ flags }: { flags: string[] | null }) {
  if (!flags || flags.length === 0) {
    return <span className="text-xs text-muted-foreground/50">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {flags.slice(0, 2).map((f) => (
        <span key={f} className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
          {f}
        </span>
      ))}
      {flags.length > 2 && (
        <span className="rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          +{flags.length - 2}
        </span>
      )}
    </div>
  )
}

function WalletRow({ hit, onClick }: { hit: WalletHit; onClick: () => void }) {
  const date = hit.indexed_at
    ? new Date(hit.indexed_at).toLocaleDateString("pt-BR")
    : "—"

  return (
    <button
      onClick={onClick}
      className="grid w-full grid-cols-[1fr_80px_100px_1fr_100px] items-center gap-4 border-b border-border/40 px-5 py-4 text-left transition-colors last:border-0 hover:bg-muted/20"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <ChainIcon chain={hit.chain} className="size-4 shrink-0" />
        <span className="truncate font-mono text-sm text-foreground">{truncate(hit.address)}</span>
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {hit.chain}
      </span>
      <div>
        {hit.score !== null ? (
          <ScoreBadge score={hit.score} />
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </div>
      <RiskBadge flags={hit.risk_flags} />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <ClockIcon className="size-3 shrink-0" strokeWidth={1.5} />
        {date}
      </div>
    </button>
  )
}

export default function SearchPage() {
  const t = useTranslations("explore")
  const router = useRouter()
  const [q, setQ] = useState("")
  const { result, loading, error, filters, setFilters } = useSearch()

  const totalPages = Math.ceil(result.total / filters.per_page) || 1

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setFilters({ q, page: 1 })
  }

  function handleWalletClick(hit: WalletHit) {
    router.push(`/analyze?chain=${hit.chain}&address=${encodeURIComponent(hit.address)}`)
  }

  return (
    <div className="flex flex-col">
      <Topbar title={t("title")} subtitle={t("subtitle")} />

      <div className="flex flex-col gap-6 p-6">
        {/* Search form */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <SearchIcon
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {loading ? t("loading") : "Buscar"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ChainChips
                selected={filters.chain}
                onChange={(chain) => setFilters({ chain, page: 1 })}
                chains={CHAINS}
              />

              <div className="ml-auto flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t("filters.minScore")}
                  min={0}
                  max={100}
                  value={filters.min_score}
                  onChange={(e) => setFilters({ min_score: e.target.value, page: 1 })}
                  className="h-8 w-24 rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder={t("filters.maxScore")}
                  min={0}
                  max={100}
                  value={filters.max_score}
                  onChange={(e) => setFilters({ max_score: e.target.value, page: 1 })}
                  className="h-8 w-24 rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      sort_by: "score",
                      sort_order: filters.sort_order === "desc" ? "asc" : "desc",
                      page: 1,
                    })
                  }
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <ActivityIcon className="size-3.5" strokeWidth={1.75} />
                  {filters.sort_order === "desc" ? t("filters.desc") : t("filters.asc")}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-3.5 text-primary" strokeWidth={2} />
              {loading ? (
                <span>{t("loading")}</span>
              ) : error ? (
                <span className="text-destructive">{t("error")}</span>
              ) : (
                <span>
                  {t("stats.results", { total: result.total })}
                  {result.processing_time_ms > 0 && (
                    <span className="ml-2 text-muted-foreground/50">
                      {t("stats.processingTime", { ms: result.processing_time_ms })}
                    </span>
                  )}
                </span>
              )}
            </div>

            {!loading && result.total > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("pagination.page", { page: filters.page, total: totalPages })}
              </span>
            )}
          </div>

          {/* Column headers */}
          {!loading && result.hits.length > 0 && (
            <div className="grid grid-cols-[1fr_80px_100px_1fr_100px] items-center gap-4 border-b border-border/40 px-5 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-dim">{t("columns.wallet")}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-dim">{t("columns.chain")}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-dim">{t("columns.score")}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-dim">{t("columns.riskFlags")}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-dim">{t("columns.indexedAt")}</span>
            </div>
          )}

          {/* Rows */}
          {loading ? (
            <div className="divide-y divide-border/40">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <ShieldAlertIcon className="size-8 text-destructive/50" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">{t("error")}</p>
            </div>
          ) : result.hits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <ZapIcon className="size-8 text-muted-foreground/30" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">{t("emptyInitial")}</p>
            </div>
          ) : (
            result.hits.map((hit) => (
              <WalletRow key={hit.id} hit={hit} onClick={() => handleWalletClick(hit)} />
            ))
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters({ page: filters.page - 1 })}
                className="h-8 rounded-lg border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                {t("pagination.prev")}
              </button>
              <span className="text-xs text-muted-foreground">
                {t("pagination.page", { page: filters.page, total: totalPages })}
              </span>
              <button
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ page: filters.page + 1 })}
                className="h-8 rounded-lg border border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                {t("pagination.next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
