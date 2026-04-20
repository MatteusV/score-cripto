"use client";

import { useCallback, useEffect, useState } from "react";

export interface ExploreWallet {
  address: string;
  chain: string;
  confidence: number | null;
  lastAnalyzedAt: string;
  lookups: number;
  reasoning: string | null;
  riskFactors: string[];
  score: number;
}

export interface ExploreRecent {
  address: string;
  chain: string;
  id: string;
  publicId: number | null;
  requestedAt: string;
  score: number | null;
}

export interface ExploreChainDistribution {
  chain: string;
  count: number;
  pct: number;
}

export interface ExploreStats {
  chains: number;
  risky: number;
  totalAnalyses: number;
  uniqueAddresses: number;
}

export interface ExploreCategory {
  count: number;
  id: string;
}

export interface ExploreData {
  categories: ExploreCategory[];
  chainDistribution: ExploreChainDistribution[];
  leaderboard: ExploreWallet[];
  recent: ExploreRecent[];
  risk: ExploreWallet[];
  stats: ExploreStats;
  trending: ExploreWallet[];
}

const EMPTY: ExploreData = {
  trending: [],
  risk: [],
  leaderboard: [],
  recent: [],
  chainDistribution: [],
  categories: [],
  stats: { totalAnalyses: 0, uniqueAddresses: 0, chains: 0, risky: 0 },
};

export function useExplore() {
  const [data, setData] = useState<ExploreData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/explore");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { error?: string }).error ?? "Erro ao carregar dados"
        );
        return;
      }
      const body = (await res.json()) as ExploreData;
      setData(body);
    } catch {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
