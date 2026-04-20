"use client";

import { useCallback, useEffect, useState } from "react";

export interface AnalysisItem {
  address: string;
  chain: string;
  completedAt: string;
  id: string;
  publicId?: number | null;
  requestedAt: string;
  score: number;
}

export interface HistorySummary {
  attention: number;
  avgScore: number;
  risky: number;
  total: number;
  trusted: number;
}

export interface HistoryPagination {
  limit: number;
  page: number;
  total: number;
}

export interface HistoryData {
  data: AnalysisItem[];
  pagination: HistoryPagination;
  summary: HistorySummary;
}

export function verdict(score: number): "Confiável" | "Atenção" | "Risco" {
  if (score >= 70) {
    return "Confiável";
  }
  if (score >= 40) {
    return "Atenção";
  }
  return "Risco";
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === todayStr) {
    return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Ontem";
  }
  return date.toLocaleDateString("pt-BR");
}

interface UseHistoryOptions {
  limit?: number;
  page?: number;
}

interface UseHistoryResult {
  data: AnalysisItem[];
  error: string | null;
  loading: boolean;
  pagination: HistoryPagination;
  refetch: () => void;
  summary: HistorySummary;
}

const EMPTY_SUMMARY: HistorySummary = {
  total: 0,
  avgScore: 0,
  trusted: 0,
  attention: 0,
  risky: 0,
};
const EMPTY_PAGINATION: HistoryPagination = { page: 1, limit: 20, total: 0 };

export function useHistory({
  limit = 20,
  page = 1,
}: UseHistoryOptions = {}): UseHistoryResult {
  const [summary, setSummary] = useState<HistorySummary>(EMPTY_SUMMARY);
  const [data, setData] = useState<AnalysisItem[]>([]);
  const [pagination, setPagination] =
    useState<HistoryPagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?page=${page}&limit=${limit}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { error?: string }).error ?? "Erro ao carregar histórico"
        );
        return;
      }
      const body = (await res.json()) as HistoryData;
      setSummary(body.summary);
      setData(body.data);
      setPagination(body.pagination);
    } catch {
      setError("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return { summary, data, pagination, loading, error, refetch: fetch_ };
}
