"use client";

import { useCallback, useEffect, useState } from "react";

export interface DeltaSummary {
  attention: number;
  avgScore: number;
  risky: number;
  total: number;
  trusted: number;
}

export interface DeltaWindow {
  current: { from: string; to: string };
  days: number;
  previous: { from: string; to: string };
}

export interface AnalysisDeltaData {
  current: DeltaSummary;
  delta: DeltaSummary;
  previous: DeltaSummary;
  window: DeltaWindow;
}

interface UseAnalysisDeltaResult {
  data: AnalysisDeltaData | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useAnalysisDelta(days: number): UseAnalysisDeltaResult {
  const [data, setData] = useState<AnalysisDeltaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analysis-delta?days=${days}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { error?: string }).error ?? "Erro ao carregar deltas"
        );
        setData(null);
        return;
      }
      const body = (await res.json()) as AnalysisDeltaData;
      setData(body);
    } catch {
      setError("Erro ao carregar deltas");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
