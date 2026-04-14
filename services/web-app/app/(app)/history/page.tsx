"use client"

import { useState } from "react"
import {
  ActivityIcon,
  FilterIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
} from "lucide-react"
import { ChainIcon } from "@/components/chain-icon"
import { ScoreBadge } from "@/components/score-badge"
import { SummaryChip } from "@/components/summary-chip"
import { Topbar } from "@/components/topbar"
import { formatDate, useHistory, verdict } from "@/hooks/use-history"

function truncate(addr: string) {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1fr_80px_100px_100px] items-center gap-4 px-5 py-4">
      <div className="h-3 w-40 animate-pulse rounded bg-muted/40" />
      <div className="h-3 w-10 animate-pulse rounded bg-muted/40" />
      <div className="h-5 w-14 animate-pulse rounded-full bg-muted/40" />
      <div className="hidden h-3 w-20 animate-pulse rounded bg-muted/40 sm:block" />
    </div>
  )
}

export default function HistoryPage() {
  const { summary, data, loading } = useHistory({ limit: 50 })
  const [search, setSearch] = useState("")
  const [chainFilter, setChainFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")

  const filtered = data.filter((row) => {
    const matchSearch =
      !search ||
      row.address.toLowerCase().includes(search.toLowerCase()) ||
      row.chain.toLowerCase().includes(search.toLowerCase())
    const matchChain = chainFilter === "all" || row.chain === chainFilter
    const matchScore =
      scoreFilter === "all" ||
      (scoreFilter === "high" && row.score >= 70) ||
      (scoreFilter === "mid" && row.score >= 40 && row.score < 70) ||
      (scoreFilter === "low" && row.score < 40)
    return matchSearch && matchChain && matchScore
  })

  return (
    <div className="flex flex-col">
      <Topbar title="Histórico" subtitle="Todas as suas análises anteriores" />

      <div className="flex flex-col gap-6 p-6">
        {/* Summary chips — dados reais do backend */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryChip label="Total de análises" value={loading ? "—" : summary.total}    icon={ActivityIcon}    variant="default" />
          <SummaryChip label="Score médio"        value={loading ? "—" : summary.avgScore} icon={TrendingUpIcon}  variant="primary" />
          <SummaryChip label="Confiáveis"         value={loading ? "—" : summary.trusted}  icon={ShieldCheckIcon} variant="green" />
          <SummaryChip label="Alto risco"         value={loading ? "—" : summary.risky}    icon={ShieldAlertIcon} variant="red" />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Buscar por endereço ou rede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-muted/30 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterIcon className="size-3.5 text-muted-foreground/50" strokeWidth={1.75} />
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
            >
              <option value="all">Todas as redes</option>
              <option value="ethereum">Ethereum</option>
              <option value="bitcoin">Bitcoin</option>
              <option value="polygon">Polygon</option>
              <option value="solana">Solana</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
            </select>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
            >
              <option value="all">Todos os scores</option>
              <option value="high">Alto (≥70)</option>
              <option value="mid">Médio (40-69)</option>
              <option value="low">Baixo (&lt;40)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_80px_100px_100px] gap-4 border-b border-border px-5 py-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
            <span>Carteira</span>
            <span>Rede</span>
            <span>Score</span>
            <span className="hidden sm:block">Data</span>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              {data.length === 0
                ? "Nenhuma análise ainda — comece analisando uma carteira!"
                : "Nenhuma análise encontrada para esses filtros."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((row) => (
                <a
                  key={row.id}
                  href={
                    row.publicId
                      ? `/analyze?id=${row.publicId}`
                      : `/analyze?chain=${row.chain}&address=${row.address}`
                  }
                  className="grid grid-cols-[1fr_80px_100px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground/80">
                      {truncate(row.address)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {verdict(row.score)}
                    </p>
                  </div>
                  <div>
                    <ChainIcon chain={row.chain} size="sm" />
                  </div>
                  <div>
                    <ScoreBadge score={row.score} />
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    {formatDate(row.completedAt)}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {!loading && (
          <p className="text-center text-xs text-muted-foreground/50">
            Mostrando {filtered.length} de {summary.total} análises
          </p>
        )}
      </div>
    </div>
  )
}
