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

const MOCK_HISTORY = [
  { id: "1", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", chain: "ethereum", score: 83, date: "13/04/2026 14:22", verdict: "Confiável"  },
  { id: "2", address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", chain: "ethereum", score: 61, date: "13/04/2026 11:05", verdict: "Atenção"   },
  { id: "3", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", chain: "bitcoin",  score: 45, date: "12/04/2026 09:30", verdict: "Atenção"   },
  { id: "4", address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", chain: "polygon",  score: 22, date: "11/04/2026 18:45", verdict: "Risco"     },
  { id: "5", address: "FiRE6c8BDSxhagJN7qzZZxjJXyKLtBpMFqq6VbnhHXmv", chain: "solana",   score: 91, date: "10/04/2026 10:12", verdict: "Confiável"  },
  { id: "6", address: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5", chain: "arbitrum", score: 77, date: "09/04/2026 16:33", verdict: "Confiável"  },
  { id: "7", address: "0x1a9C8182C09F50C8318d769245beA52c32BE35BC", chain: "optimism", score: 38, date: "08/04/2026 08:20", verdict: "Risco"     },
]

function truncate(addr: string) {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, 12)}...${addr.slice(-6)}`
}

export default function HistoryPage() {
  const [search, setSearch] = useState("")
  const [chainFilter, setChainFilter] = useState("all")
  const [scoreFilter, setScoreFilter] = useState("all")

  const filtered = MOCK_HISTORY.filter((row) => {
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

  const totalScore = MOCK_HISTORY.reduce((s, r) => s + r.score, 0)
  const avgScore = Math.round(totalScore / MOCK_HISTORY.length)
  const trusted = MOCK_HISTORY.filter((r) => r.score >= 70).length
  const risky = MOCK_HISTORY.filter((r) => r.score < 40).length

  return (
    <div className="flex flex-col">
      <Topbar title="Histórico" subtitle="Todas as suas análises anteriores" />

      <div className="flex flex-col gap-6 p-6">
        {/* Summary chips */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryChip label="Total de análises" value={MOCK_HISTORY.length} icon={ActivityIcon} variant="default" />
          <SummaryChip label="Score médio"        value={avgScore}             icon={TrendingUpIcon} variant="primary" />
          <SummaryChip label="Confiáveis"         value={trusted}              icon={ShieldCheckIcon} variant="green" />
          <SummaryChip label="Alto risco"         value={risky}               icon={ShieldAlertIcon} variant="red" />
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
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_100px_100px] gap-4 border-b border-border px-5 py-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
            <span>Carteira</span>
            <span>Rede</span>
            <span>Score</span>
            <span className="hidden sm:block">Data</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              Nenhuma análise encontrada.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((row) => (
                <a
                  key={row.id}
                  href={`/analyze?chain=${row.chain}&address=${row.address}`}
                  className="grid grid-cols-[1fr_80px_100px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground/80">
                      {truncate(row.address)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{row.verdict}</p>
                  </div>
                  <div>
                    <ChainIcon chain={row.chain} size="sm" />
                  </div>
                  <div>
                    <ScoreBadge score={row.score} />
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    {row.date}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/50">
          Mostrando {filtered.length} de {MOCK_HISTORY.length} análises
        </p>
      </div>
    </div>
  )
}
