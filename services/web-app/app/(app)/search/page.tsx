"use client";

import {
  AlertCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  CompassIcon,
  SearchIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type ExploreRecent,
  type ExploreWallet,
  useExplore,
} from "@/hooks/use-explore";

const CATEGORY_IDS = [
  "exchange",
  "defi",
  "mixer",
  "sanctions",
  "bridge",
  "nft",
  "stablecoin",
  "whale",
] as const;

const CATEGORY_ICONS: Record<(typeof CATEGORY_IDS)[number], string> = {
  exchange: "💳",
  defi: "🧠",
  mixer: "⚡",
  sanctions: "🚨",
  bridge: "→",
  nft: "🧭",
  stablecoin: "🛡️",
  whale: "💼",
};

const TAGS = [
  "Tornado Cash",
  "Binance",
  "Coinbase",
  "Lido",
  "Uniswap v4",
  "Aave",
  "Curve",
];

type Verdict = "trusted" | "attention" | "risk";

function verdictOf(score: number): Verdict {
  if (score >= 70) {
    return "trusted";
  }
  if (score >= 40) {
    return "attention";
  }
  return "risk";
}

function truncate(addr: string, chars = 6) {
  if (addr.length <= 20) {
    return addr;
  }
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 60;
  const h = 22;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" L");
  return (
    <svg
      className="flex-shrink-0"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
    >
      <title>Sparkline</title>
      <polyline
        fill="none"
        points={points}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function VerdictBadge({ verdict, label }: { verdict: Verdict; label: string }) {
  const config = {
    trusted: { bg: "bg-green-500/10", text: "text-green-600" },
    attention: { bg: "bg-amber-500/10", text: "text-amber-600" },
    risk: { bg: "bg-red-500/10", text: "text-red-600" },
  };
  const cfg = config[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium text-xs ${cfg.bg} ${cfg.text}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      {label}
    </span>
  );
}

function formatRelative(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) {
    return rtf.format(-minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return rtf.format(-hours, "hour");
  }
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}

export default function SearchPage() {
  const t = useTranslations("explore");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"trending" | "risk" | "leaderboard">(
    "trending"
  );
  const [chainFilter, setChainFilter] = useState("all");

  const [activeQuery, setActiveQuery] = useState("");

  const { data, loading, error } = useExplore();

  const matchesQuery = (w: ExploreWallet, query: string) => {
    if (!query) {
      return true;
    }
    const needle = query.toLowerCase().trim();
    return (
      w.address.toLowerCase().includes(needle) ||
      w.chain.toLowerCase().includes(needle) ||
      (w.reasoning ?? "").toLowerCase().includes(needle) ||
      w.riskFactors.some((f) => f.toLowerCase().includes(needle))
    );
  };

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of data.categories) {
      m.set(c.id, c.count);
    }
    return m;
  }, [data.categories]);

  const categoriesTotal = useMemo(
    () => data.categories.reduce((s, c) => s + c.count, 0),
    [data.categories]
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuery(q.trim());
  }

  function handleTagClick(tag: string) {
    setQ(tag);
    setActiveQuery(tag);
  }

  function handleClearQuery() {
    setQ("");
    setActiveQuery("");
  }

  function handleWalletClick(w: ExploreWallet) {
    router.push(
      `/analyze?chain=${w.chain}&address=${encodeURIComponent(w.address)}`
    );
  }

  function handleRecentClick(r: ExploreRecent) {
    router.push(`/analysis/${r.id}`);
  }

  const trendingFiltered = data.trending
    .filter((w) => chainFilter === "all" || w.chain === chainFilter)
    .filter((w) => matchesQuery(w, activeQuery));

  const riskFiltered = data.risk.filter((w) => matchesQuery(w, activeQuery));
  const leaderboardFiltered = data.leaderboard.filter((w) =>
    matchesQuery(w, activeQuery)
  );

  const availableChains = useMemo(
    () => Array.from(new Set(data.trending.map((w) => w.chain))).slice(0, 4),
    [data.trending]
  );

  return (
    <div className="flex flex-col">
      <Topbar subtitle={t("subtitle")} title={t("title")} />

      <div className="flex flex-col gap-8 p-7">
        {/* Hero section */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-card to-card/50 p-9">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-primary/8" />

          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/20 text-accent">
                <CompassIcon className="h-4 w-4" strokeWidth={2} />
              </div>
              <span className="font-bold font-heading text-[10px] text-accent uppercase tracking-[0.2em]">
                {t("hero.eyebrow")}
              </span>
            </div>

            <h1 className="mb-2 font-bold font-heading text-3xl leading-tight">
              {t("hero.heading")}{" "}
              <span className="text-accent">{t("hero.headingHighlight")}</span>{" "}
              {t("hero.headingRest")}
            </h1>

            <p className="mb-6 max-w-2xl text-muted-foreground text-sm leading-relaxed">
              {t("hero.description", {
                count: data.stats.uniqueAddresses.toLocaleString(),
                chains: data.stats.chains || 7,
              })}
            </p>

            <form className="flex flex-col gap-4" onSubmit={handleSearch}>
              <div className="relative mb-4 flex gap-3">
                <div className="relative flex-1">
                  <SearchIcon
                    className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground/50"
                    strokeWidth={2}
                  />
                  <input
                    className="h-14 w-full rounded-2xl border border-border bg-muted/50 pr-36 pl-14 text-foreground text-sm placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    type="text"
                    value={q}
                  />
                  <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
                    <span className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
                      ⌘ K
                    </span>
                    <Button
                      className="gap-1"
                      size="sm"
                      type="submit"
                      variant="default"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      {t("hero.searchCta")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                  {t("hero.suggested")}
                </span>
                {TAGS.map((tag) => (
                  <button
                    className="rounded-full border border-border bg-transparent px-3 py-1.5 text-muted-foreground text-xs transition-colors hover:border-primary/50 hover:text-foreground"
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-8 grid grid-cols-4 gap-6 border-border/50 border-t pt-8">
              {[
                {
                  value: data.stats.uniqueAddresses.toLocaleString(),
                  label: t("stats.indexed"),
                  color: "text-primary",
                },
                {
                  value: String(data.stats.chains || 0),
                  label: t("stats.chains"),
                  color: "text-accent",
                },
                {
                  value: data.stats.risky.toLocaleString(),
                  label: t("stats.risky"),
                  color: "text-destructive",
                },
                {
                  value: "24h",
                  label: t("stats.refresh"),
                  color: "text-green-500",
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className={`font-bold font-heading text-2xl ${stat.color}`}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-1 font-mono text-muted-foreground text-xs">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Categories grid */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              {t("categoriesLabel")}
            </span>
            <span className="font-mono text-muted-foreground text-xs">
              {t("categoriesTotal", {
                total: categoriesTotal.toLocaleString(),
              })}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORY_IDS.map((id) => (
              <button
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30"
                key={id}
                type="button"
              >
                <div className="relative z-10">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg">{CATEGORY_ICONS[id]}</span>
                    <span className="font-bold font-heading text-lg text-primary">
                      {(categoryCounts.get(id) ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="mb-1 font-semibold text-sm">
                    {t(`categories.${id}.label`)}
                  </div>
                  <div className="text-muted-foreground text-xs leading-tight">
                    {t(`categories.${id}.desc`)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {activeQuery && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <SearchIcon
                className="h-3.5 w-3.5 text-primary"
                strokeWidth={2}
              />
              <span>
                {t("activeFilter")}:{" "}
                <span className="font-mono font-semibold text-primary">
                  {activeQuery}
                </span>
              </span>
            </div>
            <button
              className="font-heading text-muted-foreground text-xs uppercase tracking-wide hover:text-foreground"
              onClick={handleClearQuery}
              type="button"
            >
              {t("clearFilter")}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            {t("error")}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="flex flex-col gap-6 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
                {(["trending", "risk", "leaderboard"] as const).map((id) => (
                  <button
                    className={`rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                      tab === id
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    key={id}
                    onClick={() => setTab(id)}
                    type="button"
                  >
                    {t(`tabs.${id}`)}
                  </button>
                ))}
              </div>

              {tab === "trending" && availableChains.length > 0 && (
                <div className="flex gap-2">
                  <button
                    className={`rounded-lg px-3 py-1.5 font-heading text-xs uppercase tracking-wider transition-all ${
                      chainFilter === "all"
                        ? "border border-primary/50 bg-primary/20 text-primary"
                        : "border border-border text-muted-foreground hover:border-primary/30"
                    }`}
                    onClick={() => setChainFilter("all")}
                    type="button"
                  >
                    {t("chainFilter.all")}
                  </button>
                  {availableChains.map((c) => (
                    <button
                      className={`rounded-lg px-3 py-1.5 font-heading text-xs uppercase tracking-wider transition-all ${
                        chainFilter === c
                          ? "border border-primary/50 bg-primary/20 text-primary"
                          : "border border-border text-muted-foreground hover:border-primary/30"
                      }`}
                      key={c}
                      onClick={() => setChainFilter(c)}
                      type="button"
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
                {loading && (
                  <Card className="p-6 text-muted-foreground text-sm">
                    {t("loading")}
                  </Card>
                )}
                {!loading && trendingFiltered.length === 0 && (
                  <Card className="p-6 text-muted-foreground text-sm">
                    {activeQuery ? t("noMatches") : t("trending.empty")}
                  </Card>
                )}
                {trendingFiltered.map((item, i) => {
                  const verdict = verdictOf(item.score);
                  return (
                    <Card
                      className="cursor-pointer p-4 transition-colors hover:bg-muted/50"
                      key={`${item.chain}:${item.address}`}
                      onClick={() => handleWalletClick(item)}
                    >
                      <div className="grid grid-cols-[28px_44px_1fr_140px_110px_auto] items-center gap-3">
                        <span className="text-center font-bold font-heading text-muted-foreground text-sm">
                          #{i + 1}
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 font-bold font-heading text-[10px] text-primary">
                          {item.chain.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm">
                              {truncate(item.address)}
                            </span>
                            <VerdictBadge
                              label={t(`verdict.${verdict}`)}
                              verdict={verdict}
                            />
                          </div>
                          <div className="line-clamp-1 text-muted-foreground text-xs">
                            {item.reasoning ?? "—"}
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Sparkline
                            color="var(--primary)"
                            values={Array.from(
                              { length: 12 },
                              (_, x) => Math.sin(i + x * 0.6) * 10 + item.score
                            )}
                          />
                          <div>
                            <div className="font-bold font-heading text-lg text-primary">
                              {item.score}
                            </div>
                            <div className="text-[9px] text-muted-foreground">
                              {t("trending.scoreLabel")}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-muted-foreground text-xs">
                          <div className="font-bold text-foreground text-sm">
                            {item.lookups}
                          </div>
                          <div className="text-[9px]">
                            {t("trending.lookupsLabel")}
                          </div>
                        </div>
                        <Button className="gap-1" size="sm" variant="outline">
                          <ArrowRightIcon className="h-3 w-3" />
                          {t("trending.view")}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Risk list */}
            {tab === "risk" && (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 border-destructive/30 border-b bg-destructive/10 px-5 py-3">
                  <AlertCircleIcon
                    className="h-4 w-4 text-destructive"
                    strokeWidth={2}
                  />
                  <span className="font-bold font-heading text-[10px] text-destructive uppercase tracking-wider">
                    {t("risk.heading")}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {loading && (
                    <div className="p-6 text-muted-foreground text-sm">
                      {t("loading")}
                    </div>
                  )}
                  {!loading && riskFiltered.length === 0 && (
                    <div className="p-6 text-muted-foreground text-sm">
                      {t("risk.empty")}
                    </div>
                  )}
                  {riskFiltered.map((item) => (
                    <div
                      className="grid grid-cols-[44px_52px_1fr_auto_auto] items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                      key={`${item.chain}:${item.address}`}
                    >
                      <div className="text-center font-bold font-heading text-2xl text-destructive">
                        {item.score}
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/20 font-bold font-heading text-[9px] text-destructive">
                        {item.chain.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">
                            {truncate(item.address)}
                          </span>
                          <span className="rounded border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                            {t("risk.highRisk")}
                          </span>
                        </div>
                        <div className="truncate font-mono text-muted-foreground text-xs">
                          {item.riskFactors.length > 0
                            ? item.riskFactors.slice(0, 2).join(" · ")
                            : (item.reasoning ?? "—")}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        {t("risk.report")}
                      </Button>
                      <Button
                        className="gap-1"
                        onClick={() => handleWalletClick(item)}
                        size="sm"
                        variant="outline"
                      >
                        <ArrowRightIcon className="h-3 w-3" />
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
                <div className="flex items-center gap-2 border-green-500/30 border-b bg-green-500/10 px-5 py-3">
                  <ShieldCheckIcon
                    className="h-4 w-4 text-green-600"
                    strokeWidth={2}
                  />
                  <span className="font-bold font-heading text-[10px] text-green-600 uppercase tracking-wider">
                    {t("leaderboard.heading")}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {loading && (
                    <div className="p-6 text-muted-foreground text-sm">
                      {t("loading")}
                    </div>
                  )}
                  {!loading && leaderboardFiltered.length === 0 && (
                    <div className="p-6 text-muted-foreground text-sm">
                      {t("leaderboard.empty")}
                    </div>
                  )}
                  {leaderboardFiltered.map((item, idx) => (
                    <div
                      className="grid grid-cols-[48px_52px_1fr_200px_80px_auto] items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                      key={`${item.chain}:${item.address}`}
                    >
                      <div className="flex items-center gap-2">
                        {idx < 3 && (
                          <span className="text-lg">{"🥇🥈🥉"[idx]}</span>
                        )}
                        <span className="font-bold font-heading text-muted-foreground text-sm">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 font-bold font-heading text-[9px] text-blue-600">
                        {item.chain.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-sm">
                          {truncate(item.address)}
                        </div>
                        <div className="mt-1 truncate font-mono text-muted-foreground text-xs">
                          {item.reasoning ?? "—"}
                        </div>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {item.confidence === null
                          ? "—"
                          : `conf. ${Math.round(item.confidence * 100)}%`}
                      </div>
                      <div className="font-bold font-heading text-green-600 text-xl">
                        {item.score}
                      </div>
                      <Button
                        onClick={() => handleWalletClick(item)}
                        size="sm"
                        variant="outline"
                      >
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
              <div className="mb-4 flex items-center gap-2">
                <ClockIcon
                  className="h-3.5 w-3.5 text-muted-foreground"
                  strokeWidth={2}
                />
                <span className="font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-wider">
                  {t("sidebar.recentTitle")}
                </span>
              </div>
              <div className="space-y-2">
                {data.recent.length === 0 && (
                  <div className="text-muted-foreground text-xs">
                    {t("sidebar.recentEmpty")}
                  </div>
                )}
                {data.recent.map((r) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-muted/50"
                    key={r.id}
                    onClick={() => handleRecentClick(r)}
                    type="button"
                  >
                    <SearchIcon
                      className="h-3 w-3 flex-shrink-0 text-muted-foreground"
                      strokeWidth={2}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium font-mono text-foreground text-xs">
                        {truncate(r.address)}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {r.chain} · {formatRelative(r.requestedAt, "pt-BR")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {data.recent.length > 0 && (
                <button
                  className="mt-3 font-heading text-muted-foreground text-xs uppercase tracking-wide hover:text-foreground"
                  type="button"
                >
                  {t("sidebar.recentClear")}
                </button>
              )}
            </Card>

            <Card className="p-4 backdrop-blur">
              <span className="mb-4 block font-bold font-heading text-[10px] text-muted-foreground uppercase tracking-wider">
                {t("sidebar.chainDistribution")}
              </span>
              <div className="space-y-4">
                {data.chainDistribution.length === 0 && (
                  <div className="text-muted-foreground text-xs">—</div>
                )}
                {data.chainDistribution.map((chain) => (
                  <div key={chain.chain}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-foreground capitalize">
                        {chain.chain}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {chain.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full bg-gradient-to-r from-primary/80 to-primary/40"
                        style={{ width: `${chain.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-primary/30 bg-primary/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ZapIcon
                  className="h-3.5 w-3.5 text-primary"
                  strokeWidth={2.5}
                />
                <span className="font-bold font-heading text-[10px] text-primary uppercase tracking-wider">
                  {t("sidebar.proEyebrow")}
                </span>
              </div>
              <p className="mb-3 text-muted-foreground text-xs leading-relaxed">
                {t("sidebar.proDescription")}
              </p>
              <Button className="w-full gap-1" size="sm" variant="default">
                <ArrowRightIcon className="h-3 w-3" />
                {t("sidebar.proCta")}
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
