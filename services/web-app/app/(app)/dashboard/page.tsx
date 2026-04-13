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
import { useUser } from "@/hooks/use-user"
import { ChainChips } from "@/components/chain-chips"
import { StatCard } from "@/components/stat-card"
import { ScoreBadge } from "@/components/score-badge"
import { ChainIcon } from "@/components/chain-icon"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"

const RECENT_ANALYSES = [
  {
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    chain: "ethereum",
    score: 83,
    date: "Hoje, 14:22",
  },
  {
    address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    chain: "ethereum",
    score: 61,
    date: "Hoje, 11:05",
  },
  {
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    chain: "bitcoin",
    score: 45,
    date: "Ontem",
  },
]

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
    planLabel,
  } = useUser()
  const router = useRouter()
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
        title="Dashboard"
        subtitle={`Bem-vindo de volta, ${firstName}`}
        showUpgrade={!isPro}
      />

      <div className="flex flex-col gap-8 p-6">
        {/* Search hero */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 font-heading text-sm font-bold tracking-wider text-foreground">
            Analisar nova carteira
          </p>
          <form onSubmit={handleAnalyze} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Cole o endereço da carteira aqui..."
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
              Analisar
            </Button>
          </form>

          {/* Usage bar */}
          {user && (
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{analysisCount} de {analysisLimit} análises este mês</span>
                <span className={limitReached ? "text-destructive" : "text-primary"}>
                  {analysisRemaining} restantes
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
          <StatCard label="Análises totais" value={analysisCount} icon={ActivityIcon} />
          <StatCard label="Restantes"      value={analysisRemaining}             icon={ZapIcon} />
          <StatCard label="Plano atual"    value={isPro ? "Pro" : "Free"}         icon={ShieldCheckIcon} />
          <StatCard
            label="Score médio"
            value="63"
            delta="+4 vs. semana passada"
            deltaPositive
            icon={BarChart2Icon}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Recent analyses */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-primary/70" strokeWidth={1.75} />
                <span className="font-heading text-sm font-semibold tracking-wider">Análises recentes</span>
              </div>
              <Button variant="ghost" size="sm" className="cursor-pointer text-xs" asChild>
                <a href="/history">Ver todas</a>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {RECENT_ANALYSES.map((item) => (
                <a
                  key={item.address}
                  href={`/analyze?chain=${item.chain}&address=${item.address}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/3"
                >
                  <ChainIcon chain={item.chain} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-foreground/80">
                      {truncate(item.address)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{item.date}</p>
                  </div>
                  <ScoreBadge score={item.score} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-3">
            <p className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Ações rápidas
            </p>
            {[
              {
                href: "/analyze",
                icon: SearchIcon,
                title: "Nova análise",
                desc: "Consulte score de qualquer endereço",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                href: "/history",
                icon: ClockIcon,
                title: "Ver histórico",
                desc: "Todas as suas análises anteriores",
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                href: "/settings/billing",
                icon: ZapIcon,
                title: "Fazer upgrade",
                desc: "Amplie seus limites com o plano Pro",
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
