"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  BarChart3Icon,
  BellIcon,
  BrainIcon,
  ClockIcon,
  CompassIcon,
  GlobeIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { ChainChips } from "@/components/chain-chips"
import { ChainIcon } from "@/components/chain-icon"
import { ScoreBadge } from "@/components/score-badge"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

// Sample data para demo
const TRENDING_DATA = [
  { addr: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label: "vitalik.eth", chain: "ethereum", score: 82, verdict: "trusted", delta: 2, lookups: "4.1k" },
  { addr: "0x00000000219ab540356cBB839Cbe05303d7705Fa", label: "Beacon Deposit", chain: "ethereum", score: 98, verdict: "trusted", delta: 0, lookups: "3.8k" },
  { addr: "0x742d35Cc6634C0532925a3b844Bc9e7595f4e2bc", label: null, chain: "polygon", score: 45, verdict: "attention", delta: -12, lookups: "2.4k" },
]

const RISK_DATA = [
  { addr: "0x8589427373D6D84E98730D7795D8f6f8731FDA16", label: "Tornado Router", chain: "ethereum", score: 8, why: "Sancionado OFAC · 2022-08-08" },
]

const LEADERBOARD_DATA = [
  { rank: 1, addr: "0x00000000219ab540356cBB839Cbe05303d7705Fa", label: "Beacon Deposit", chain: "ethereum", score: 98, note: "Infraestrutura Ethereum" },
  { rank: 2, addr: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", label: "Circle · USDC", chain: "ethereum", score: 96, note: "Issuer verificado" },
]

const CATEGORIES = [
  { id: "exchange", label: "Exchanges", count: 412, desc: "CEX custodiais · hot & cold wallets verificadas", icon: "💳" },
  { id: "defi", label: "DeFi", count: 1843, desc: "Protocolos auditados · vaults · routers", icon: "🧠" },
  { id: "mixer", label: "Mixers", count: 87, desc: "Tornado · Wasabi · Samourai · proxies", icon: "⚡" },
  { id: "sanctions", label: "Sanções", count: 2410, desc: "OFAC · UK HMT · EU consolidated", icon: "🚨" },
  { id: "bridge", label: "Bridges", count: 64, desc: "Wormhole · Across · Stargate · LayerZero", icon: "→" },
  { id: "nft", label: "NFT", count: 512, desc: "Marketplaces · creator contracts · royalty splitters", icon: "🧭" },
  { id: "stablecoin", label: "Stablecoins", count: 18, desc: "USDC · USDT · DAI · PYUSD · issuers", icon: "🛡️" },
  { id: "whale", label: "Whales", count: 240, desc: "Carteiras com >$10M em movimentação anual", icon: "💼" },
]

const TAGS = ["Tornado Cash", "Binance", "Coinbase", "Lido", "Uniswap v4", "Aave", "Curve"]

const RECENT_SEARCHES = [
  { q: "vitalik.eth", results: 1, when: "há 4 min" },
  { q: "tornado cash", results: 14, when: "há 2h" },
]

function truncate(addr: string, chars = 6) {
  if (addr.length <= 20) return addr
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`
}

// Simple sparkline component
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

function VerdictBadge({ verdict }: { verdict: string }) {
  const config = {
    trusted: { bg: "bg-green-500/10", text: "text-green-600", label: "Confiável" },
    attention: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Atenção" },
    risk: { bg: "bg-red-500/10", text: "text-red-600", label: "Risco Alto" },
  }
  const cfg = config[verdict as keyof typeof config] || config.attention
  return <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
    {cfg.label}
  </span>
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
      <div className="flex flex-wrap gap-1">
        {hit.risk_flags && hit.risk_flags.slice(0, 2).map((f) => (
          <span key={f} className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
            {f}
          </span>
        ))}
      </div>
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
  const [tab, setTab] = useState<"trending" | "risk" | "leaderboard">("trending")
  const [chainFilter, setChainFilter] = useState("")

  const { result, loading, error, filters, setFilters } = useSearch()
  const totalPages = Math.ceil(result.total / filters.per_page) || 1

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setFilters({ q, page: 1 })
  }

  function handleWalletClick(hit: WalletHit) {
    router.push(`/analyze?chain=${hit.chain}&address=${encodeURIComponent(hit.address)}`)
  }

  function handleTagClick(tag: string) {
    setQ(tag)
    setFilters({ q: tag, page: 1 })
  }

  return (
    <div className="flex flex-col">
      <Topbar title={t("title")} subtitle={t("subtitle")} />

      <div className="flex flex-col gap-8 p-7">
        {/* Hero section with glow */}
        <div className="relative rounded-3xl border border-border/50 bg-gradient-to-b from-card to-card/50 p-9 overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-primary/8 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                <CompassIcon className="w-4 h-4" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-accent">Explorar</span>
            </div>

            <h1 className="text-3xl font-heading font-bold mb-2 leading-tight">
              Descubra carteiras, <span className="text-accent">entidades</span> e padrões on-chain
            </h1>

            <p className="text-sm text-muted-foreground mb-6 max-w-2xl leading-relaxed">
              2.4M endereços indexados em 7 redes. Busque por label, endereço, categoria ou descubra o que está em alta na comunidade.
            </p>

            {/* Search form */}
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div className="relative flex gap-3 mb-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" strokeWidth={2} />
                  <input
                    type="text"
                    placeholder="Buscar por endereço, label, ENS, domain, categoria…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-border bg-muted/50 pl-14 pr-36 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-1">⌘ K</span>
                    <Button variant="default" size="sm" className="gap-1">
                      <ArrowRightIcon className="w-4 h-4" />
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Suggested tags */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-heading uppercase tracking-[0.3em] text-muted-foreground">Sugeridos</span>
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-3 py-1.5 rounded-full border border-border bg-transparent text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-6 mt-8 pt-8 border-t border-border/50">
              {[
                { value: "2.4M", label: "endereços indexados", color: "text-primary" },
                { value: "7", label: "blockchains", color: "text-accent" },
                { value: "2,410", label: "sancionados (OFAC)", color: "text-destructive" },
                { value: "24h", label: "refresh contínuo", color: "text-green-500" },
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
              Categorias · Navegar por entidade
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {CATEGORIES.reduce((s, c) => s + c.count, 0).toLocaleString()} endereços
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className="relative text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:-translate-y-0.5 transition-all group overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{
                  background: `radial-gradient(circle at top right, var(--primary)/8, transparent 70%)`
                }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-heading font-bold text-lg text-primary">{cat.count.toLocaleString()}</span>
                  </div>
                  <div className="font-semibold text-sm mb-1">{cat.label}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{cat.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main content layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Tabs and filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
                {[
                  { id: "trending", label: "🔥 Trending" },
                  { id: "risk", label: "△ Risk list" },
                  { id: "leaderboard", label: "↑ Top score" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id as typeof tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      tab === t.id
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "trending" && (
                <div className="flex gap-2">
                  {["all", "ethereum", "polygon", "arbitrum"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setChainFilter(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${
                        chainFilter === c
                          ? "bg-primary/20 border border-primary/50 text-primary"
                          : "border border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {c === "all" ? "Todas" : c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trending tab */}
            {tab === "trending" && (
              <div className="space-y-3">
                {TRENDING_DATA.map((item, i) => (
                  <Card key={i} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="grid grid-cols-[28px_44px_1fr_140px_110px_110px_auto] gap-3 items-center">
                      <span className="font-heading font-bold text-sm text-muted-foreground text-center">#{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[10px] font-heading font-bold">
                        {item.chain.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{item.label || truncate(item.addr)}</span>
                          <VerdictBadge verdict={item.verdict} />
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">Sample wallet analysis reason</div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Sparkline values={Array.from({length: 12}, (_, x) => Math.sin(i+x*0.6)*10 + item.score)} color="var(--primary)" />
                        <div>
                          <div className="font-heading font-bold text-lg text-primary">{item.score}</div>
                          <div className="text-[9px] text-muted-foreground">score</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-sm text-green-500">
                          {item.delta > 0 ? `↑${item.delta}` : item.delta < 0 ? `↓${Math.abs(item.delta)}` : "·"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">24h</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        <div className="text-foreground font-bold text-sm">{item.lookups}</div>
                        <div className="text-[9px]">consultas 24h</div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ArrowRightIcon className="w-3 h-3" />
                        Ver
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Risk list tab */}
            {tab === "risk" && (
              <Card className="overflow-hidden">
                <div className="bg-destructive/10 border-b border-destructive/30 px-5 py-3 flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-destructive" strokeWidth={2} />
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-destructive">Carteiras de risco em alta</span>
                  <div className="ml-auto text-[10px] text-muted-foreground font-mono">atualizado há 6 min</div>
                </div>
                <div className="divide-y divide-border">
                  {RISK_DATA.map((item, i) => (
                    <div key={i} className="grid grid-cols-[44px_52px_1fr_auto_auto] gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                      <div className="font-heading font-bold text-2xl text-destructive text-center">{item.score}</div>
                      <div className="w-9 h-9 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center text-[9px] font-heading font-bold">
                        {item.chain.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{item.label || truncate(item.addr)}</span>
                          <span className="text-[10px] border border-destructive/50 bg-destructive/10 text-destructive px-2 py-0.5 rounded">Alto risco</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{truncate(item.addr, 10)} · {item.why}</div>
                      </div>
                      <Button variant="ghost" size="sm">Reportar</Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ArrowRightIcon className="w-3 h-3" />
                        Investigar
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Leaderboard tab */}
            {tab === "leaderboard" && (
              <Card className="overflow-hidden">
                <div className="bg-green-500/10 border-b border-green-500/30 px-5 py-3 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-green-600" strokeWidth={2} />
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-green-600">Top scores · Carteiras e protocolos</span>
                </div>
                <div className="divide-y divide-border">
                  {LEADERBOARD_DATA.map((item) => (
                    <div key={item.rank} className="grid grid-cols-[48px_52px_1fr_200px_80px_auto] gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        {item.rank <= 3 && <span className="text-lg">{"🥇🥈🥉"[item.rank - 1]}</span>}
                        <span className="font-heading font-bold text-sm text-muted-foreground">#{item.rank}</span>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center text-[9px] font-heading font-bold">
                        {item.chain.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1 truncate">{item.addr}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{item.note}</div>
                      <div className="font-heading font-bold text-xl text-green-600">{item.score}</div>
                      <Button variant="outline" size="sm">Detalhes</Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            {/* Recent searches */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground">Buscas recentes</span>
              </div>
              <div className="space-y-2">
                {RECENT_SEARCHES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleTagClick(s.q)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <SearchIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" strokeWidth={2} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate font-mono">{s.q}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.results} resultado{s.results !== 1 ? "s" : ""} · {s.when}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button className="mt-3 text-xs text-muted-foreground hover:text-foreground font-heading tracking-wide uppercase">Limpar histórico →</button>
            </Card>

            {/* Chain distribution */}
            <Card className="p-4 backdrop-blur">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground block mb-4">Distribuição por chain</span>
              <div className="space-y-4">
                {[
                  { name: "Ethereum", pct: 48 },
                  { name: "Bitcoin", pct: 22 },
                  { name: "Polygon", pct: 12 },
                  { name: "Solana", pct: 10 },
                  { name: "Arbitrum", pct: 5 },
                  { name: "Outros", pct: 3 },
                ].map((chain, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-foreground">{chain.name}</span>
                      <span className="text-muted-foreground font-mono">{chain.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary/80 to-primary/40" style={{ width: `${chain.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pro upgrade CTA */}
            <Card className="p-4 bg-primary/10 border-primary/30">
              <div className="flex items-center gap-2 mb-3">
                <ZapIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-primary">Explorar + Pro</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Filtros avançados, alertas em tempo real por categoria, exportação de listas e API.
              </p>
              <Button variant="default" size="sm" className="w-full gap-1">
                <ArrowRightIcon className="w-3 h-3" />
                Conhecer plano Pro
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
