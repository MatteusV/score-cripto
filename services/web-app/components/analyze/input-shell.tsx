"use client";

import {
  BrainCircuitIcon,
  ClockIcon,
  CompassIcon,
  SearchIcon,
  ShieldCheckIcon,
  WalletIcon,
  ZapIcon,
  ZapOffIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHistory } from "@/hooks/use-history";
import { useUser } from "@/hooks/use-user";
import { normalizeChainInput, SUPPORTED_CHAINS } from "@/lib/query";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const CHAIN_SYMBOL: Record<string, string> = {
  ethereum: "ETH",
  polygon: "MATIC",
  arbitrum: "ARB",
  base: "BASE",
  optimism: "OP",
  avalanche: "AVAX",
  bsc: "BNB",
};

const SAMPLES = [
  {
    chain: "ethereum",
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    tag: "vitalik.eth",
  },
  {
    chain: "ethereum",
    address: "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    tag: "ETH2 deposit",
  },
  {
    chain: "polygon",
    address: "0x742d35Cc6634C0532925a3b844Bc454Bc9e7595f",
    tag: "exemplo",
  },
];

const WHAT_FEATURES = [
  {
    icon: <ClockIcon className="size-[15px]" />,
    title: "Histórico on-chain",
    desc: "Idade, volume, consistência, pausas suspeitas",
  },
  {
    icon: <ShieldCheckIcon className="size-[15px]" />,
    title: "Sanções & listas",
    desc: "OFAC + listas comunitárias de risco",
  },
  {
    icon: <ZapIcon className="size-[15px]" />,
    title: "Mixers & bridges",
    desc: "Tornado Cash, Wasabi, Samourai, CEX deposits",
  },
  {
    icon: <BrainCircuitIcon className="size-[15px]" />,
    title: "Padrões DeFi",
    desc: "Diversidade de contrapartes, farming, NFTs",
  },
  {
    icon: <CompassIcon className="size-[15px]" />,
    title: "Concentração",
    desc: "Token único, whale moves, peak activity",
  },
  {
    icon: <SearchIcon className="size-[15px]" />,
    title: "Reasoning da IA",
    desc: "Raciocínio auditável, modelo + prompt versionado",
  },
];

function scoreColor(score: number) {
  if (score >= 70) {
    return "oklch(0.74 0.19 66)";
  }
  if (score >= 40) {
    return "oklch(0.74 0.16 85)";
  }
  return "oklch(0.63 0.24 28)";
}

export function AnalyzeInputShell() {
  const t = useTranslations("analyze.input");
  const router = useRouter();
  const [chain, setChain] = useState("ethereum");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const { analysisRemaining, analysisLimit } = useUser();
  const { data: recentItems } = useHistory({ limit: 3 });

  const errorMessage = useMemo(() => {
    if (!touched) {
      return null;
    }
    if (!address.trim()) {
      return t("errors.empty");
    }
    if (!EVM_ADDRESS_PATTERN.test(address.trim())) {
      return t("errors.invalidEvm");
    }
    return null;
  }, [address, touched, t]);

  const isValid = Boolean(
    address.trim() && EVM_ADDRESS_PATTERN.test(address.trim())
  );

  async function handleAnalyze() {
    setTouched(true);
    if (!isValid) {
      return;
    }

    const checkRes = await fetch("/api/billing/usage-check", {
      method: "POST",
    }).catch(() => null);
    if (checkRes?.status === 429) {
      setLimitReached(true);
      return;
    }

    router.push(
      `/analyze?chain=${normalizeChainInput(chain)}&address=${address.trim()}`
    );
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAddress(text.trim());
      }
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
      {/* ── Main column ── */}
      <div className="flex flex-col gap-5">
        {/* Hero card */}
        <div className="glass-panel glow-line relative overflow-hidden rounded-2xl border border-border/30">
          {/* bg glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 80% at 100% 0%, oklch(0.74 0.19 66 / 14%), transparent 60%), radial-gradient(50% 70% at 0% 100%, oklch(0.59 0.22 295 / 10%), transparent 60%)",
            }}
          />

          <div className="relative px-8 pt-8 pb-7">
            {/* Eyebrow */}
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-[10px] border border-primary/25 bg-primary/10 text-primary">
                <SearchIcon className="size-4" />
              </span>
              <p className="font-heading text-[9px] text-primary uppercase tracking-[0.3em]">
                NOVA ANÁLISE
              </p>
            </div>

            <h1 className="font-bold font-heading text-[30px] leading-[1.1] tracking-[0.01em]">
              Cole um endereço e receba um{" "}
              <span
                className="text-primary"
                style={{ textShadow: "0 0 28px oklch(0.74 0.19 66 / 45%)" }}
              >
                score auditável
              </span>
            </h1>
            <p className="mt-2.5 max-w-xl text-[13.5px] text-muted-foreground leading-[1.6]">
              {t("heroSubtext")}
            </p>

            {/* Address input */}
            <div className="mt-5">
              <label
                className="mb-2 block font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]"
                htmlFor="address-input"
              >
                {t("addressLabel")}
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground/70">
                  <WalletIcon
                    className="size-4"
                    style={{
                      color: errorMessage ? "var(--destructive)" : undefined,
                    }}
                  />
                </span>
                <input
                  aria-invalid={Boolean(errorMessage)}
                  autoComplete="off"
                  className="h-[60px] w-full rounded-[14px] border bg-input px-5 pr-20 pl-12 font-mono text-[15px] tracking-[0.01em] outline-none transition-colors focus:border-primary/50"
                  id="address-input"
                  onBlur={() => setTouched(true)}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAnalyze().catch(() => {
                        // errors surfaced via state
                      });
                    }
                  }}
                  placeholder={t("addressPlaceholder")}
                  spellCheck={false}
                  style={{
                    borderColor: errorMessage
                      ? "var(--destructive)"
                      : "var(--border)",
                  }}
                  value={address}
                />
                <button
                  aria-label="Colar endereço"
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer rounded-[7px] border border-border bg-muted px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    handlePaste().catch(() => {
                      // clipboard unavailable; ignore
                    });
                  }}
                  type="button"
                >
                  {t("paste")}
                </button>
              </div>
              {errorMessage && (
                <p
                  className="mt-2 flex items-center gap-1.5 text-[11.5px] text-destructive"
                  role="alert"
                >
                  <svg
                    aria-hidden
                    className="size-3 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <title>Error</title>
                    <circle cx="12" cy="12" r="10" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Chain picker */}
            <div className="mt-4">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                  {t("chainLabel")}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {t("chainAutodetect")}
                </span>
              </div>
              <div
                aria-label={t("chainLabel")}
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
              >
                {SUPPORTED_CHAINS.map((c) => (
                  // biome-ignore lint/a11y/useSemanticElements: custom styled radio — uses aria-checked on button role=radio
                  <button
                    aria-checked={chain === c.value}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-1.5 font-semibold text-xs transition-all duration-200"
                    key={c.value}
                    onClick={() => setChain(c.value)}
                    role="radio"
                    style={{
                      border:
                        chain === c.value
                          ? "1px solid oklch(0.74 0.19 66 / 50%)"
                          : "1px solid var(--border)",
                      background:
                        chain === c.value
                          ? "oklch(0.74 0.19 66 / 12%)"
                          : "transparent",
                      color:
                        chain === c.value
                          ? "oklch(0.74 0.19 66)"
                          : "var(--muted-foreground)",
                      boxShadow:
                        chain === c.value
                          ? "0 0 12px oklch(0.74 0.19 66 / 20%)"
                          : "none",
                    }}
                    type="button"
                  >
                    <span className="font-bold font-mono text-[9px] opacity-70">
                      {CHAIN_SYMBOL[c.value] ??
                        c.value.slice(0, 4).toUpperCase()}
                    </span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Limit reached banner */}
            {limitReached && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
                <ZapOffIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-destructive text-sm">
                    Limite mensal atingido
                  </p>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    Você usou todas as análises do seu plano este mês.{" "}
                    <Link
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      href="/settings/billing"
                    >
                      Fazer upgrade →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* Actions row */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Button
                className="h-[52px] cursor-pointer px-7 text-[15px]"
                disabled={touched && !isValid}
                onClick={() => {
                  handleAnalyze().catch(() => {
                    // errors surfaced via state
                  });
                }}
                size="lg"
              >
                <BrainCircuitIcon className="mr-1.5 size-4" />
                {t("analyzeBtn")}
              </Button>
              <Button
                className="h-[52px] cursor-pointer"
                onClick={() => {
                  setAddress("");
                  setTouched(false);
                }}
                size="lg"
                variant="outline"
              >
                {t("clearBtn")}
              </Button>
              <div className="flex-1" />
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{
                      background: "oklch(0.69 0.19 162)",
                      animation: "scDotPulse 2s ease-in-out infinite",
                    }}
                  />
                  {t("pipelineOnline")}
                </span>
                <span>·</span>
                <span>
                  {t("remaining", {
                    count: analysisRemaining ?? "–",
                    limit: analysisLimit ?? "–",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Sample strip */}
          <div className="relative flex flex-wrap items-center gap-3.5 border-border/30 border-t bg-card/30 px-8 py-3.5">
            <span className="shrink-0 font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
              {t("samplesLabel")}
            </span>
            {SAMPLES.map((s) => (
              <button
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground transition-colors hover:border-primary/30"
                key={`${s.chain}-${s.address}`}
                onClick={() => {
                  setChain(s.chain);
                  setAddress(s.address);
                }}
                type="button"
              >
                <span className="font-bold font-heading text-[9px] text-muted-foreground uppercase">
                  {CHAIN_SYMBOL[s.chain]}
                </span>
                <span>
                  {s.address.slice(0, 6)}…{s.address.slice(-4)}
                </span>
                <Badge
                  className="px-1.5 py-0 font-sans text-[9px]"
                  variant="outline"
                >
                  {s.tag}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* What AI analyzes */}
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-5 pb-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-heading text-[9px] text-muted-foreground uppercase tracking-[0.3em]">
                {t("whatTitle")}
              </p>
              <Badge className="px-2 text-[9px]" variant="secondary">
                {t("whatSignals")}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WHAT_FEATURES.map((f) => (
                <div
                  className="flex gap-3 rounded-[12px] border border-border/40 bg-card/40 p-3.5"
                  key={f.title}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[12.5px]">{f.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-[1.4]">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sidebar ── */}
      <aside className="flex flex-col gap-4">
        {/* Recent analyses */}
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-4 pb-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                {t("recentTitle")}
              </p>
              <Button
                asChild
                className="h-6 px-2 text-[11px]"
                size="sm"
                variant="ghost"
              >
                <Link href="/history">{t("viewAll")}</Link>
              </Button>
            </div>

            {recentItems.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted-foreground">
                Nenhuma análise ainda.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {recentItems.map((item) => (
                  <button
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-border/40 bg-transparent px-2.5 py-2.5 text-left transition-colors hover:border-primary/20 hover:bg-card/60"
                    key={item.id}
                    onClick={() => {
                      setChain(item.chain);
                      setAddress(item.address);
                    }}
                    type="button"
                  >
                    <span className="shrink-0 font-bold font-heading text-[9px] text-muted-foreground uppercase">
                      {CHAIN_SYMBOL[item.chain] ?? item.chain.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[11.5px]">
                        {item.address.slice(0, 8)}…{item.address.slice(-4)}
                      </p>
                      <p className="mt-0.5 font-mono text-[9.5px] text-muted-foreground">
                        {item.chain}
                      </p>
                    </div>
                    <span
                      className="shrink-0 font-bold font-heading text-[13px]"
                      style={{ color: scoreColor(item.score) }}
                    >
                      {item.score}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-border/30 bg-card/40">
          <CardContent className="pt-4 pb-4">
            <p className="mb-2.5 font-heading text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
              {t("tipsTitle")}
            </p>
            <ul className="flex flex-col gap-2.5">
              {([0, 1, 2] as const).map((i) => (
                <li
                  className="flex gap-2 text-[11.5px] text-muted-foreground leading-[1.5]"
                  key={i}
                >
                  <span className="shrink-0 text-primary">→</span>
                  {t(`tip${i}` as "tip0" | "tip1" | "tip2")}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
