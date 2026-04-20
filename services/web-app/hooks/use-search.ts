"use client";

import { useCallback, useEffect, useState } from "react";

export interface WalletHit {
  address: string;
  chain: string;
  confidence: number | null;
  id: string;
  indexed_at: string;
  risk_flags: string[] | null;
  score: number | null;
  tx_count: number | null;
  wallet_age_days: number | null;
}

export interface SearchResult {
  hits: WalletHit[];
  page: number;
  per_page: number;
  processing_time_ms: number;
  total: number;
}

export interface SearchFilters {
  chain: string;
  max_score: string;
  min_score: string;
  page: number;
  per_page: number;
  q: string;
  sort_by: string;
  sort_order: "asc" | "desc";
}

const DEFAULT_FILTERS: SearchFilters = {
  q: "",
  chain: "",
  min_score: "",
  max_score: "",
  sort_by: "score",
  sort_order: "desc",
  page: 1,
  per_page: 20,
};

const EMPTY_RESULT: SearchResult = {
  hits: [],
  total: 0,
  page: 1,
  per_page: 20,
  processing_time_ms: 0,
};

interface UseSearchResult {
  error: string | null;
  filters: SearchFilters;
  loading: boolean;
  refetch: () => void;
  result: SearchResult;
  setFilters: (filters: Partial<SearchFilters>) => void;
}

export function useSearch(
  initial: Partial<SearchFilters> = {}
): UseSearchResult {
  const [filters, setFiltersState] = useState<SearchFilters>({
    ...DEFAULT_FILTERS,
    ...initial,
  });
  const [result, setResult] = useState<SearchResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setFilters = useCallback((partial: Partial<SearchFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...partial,
      page: partial.page === undefined ? 1 : partial.page,
    }));
  }, []);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.q) {
        params.set("q", filters.q);
      }
      if (filters.chain) {
        params.set("chain", filters.chain);
      }
      if (filters.min_score) {
        params.set("min_score", filters.min_score);
      }
      if (filters.max_score) {
        params.set("max_score", filters.max_score);
      }
      if (filters.sort_by) {
        params.set("sort_by", filters.sort_by);
      }
      params.set("sort_order", filters.sort_order);
      params.set("page", String(filters.page));
      params.set("per_page", String(filters.per_page));

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { error?: string }).error ?? "Erro ao buscar carteiras"
        );
        return;
      }
      const body = (await res.json()) as SearchResult;
      setResult(body);
    } catch {
      setError("Erro ao buscar carteiras");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { result, loading, error, filters, setFilters, refetch: fetch_ };
}
