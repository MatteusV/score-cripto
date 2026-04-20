"use client";

import { useAuth } from "@/contexts/auth-context";

export interface UserData {
  /** Análises consumidas no mês atual */
  analysisCount: number;

  /** Limite mensal conforme o plano */
  analysisLimit: number;

  /** Análises restantes (nunca negativo) */
  analysisRemaining: number;

  /** Primeiro nome ou fallback */
  firstName: string;

  /** Iniciais para avatar (máx 2 chars) */
  initials: string;

  /** true se o usuário está autenticado */
  isAuthenticated: boolean;

  /** true se o plano é PRO */
  isPro: boolean;

  /** true se o limite foi atingido */
  limitReached: boolean;
  loading: boolean;

  /** Ações do contexto de auth */
  login: ReturnType<typeof useAuth>["login"];
  logout: ReturnType<typeof useAuth>["logout"];

  /** Label do plano: "Pro" | "Free" */
  planLabel: string;
  refresh: ReturnType<typeof useAuth>["refresh"];
  register: ReturnType<typeof useAuth>["register"];

  /** Percentual de uso 0-100 */
  usagePct: number;
  /** Dados brutos do perfil (null enquanto carrega) */
  user: ReturnType<typeof useAuth>["user"];
}

export function useUser(): UserData {
  const { user, loading, login, register, logout, refresh } = useAuth();

  const count = user?.analysisCount ?? 0;
  const limit = user?.analysisLimit ?? 0;
  const remaining = Math.max(limit - count, 0);
  const usagePct = limit > 0 ? Math.min((count / limit) * 100, 100) : 0;

  const firstName = user?.name?.split(" ")[0] ?? "de volta";

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "??");

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    isPro: user?.plan === "PRO",
    analysisCount: count,
    analysisLimit: limit,
    analysisRemaining: remaining,
    usagePct,
    limitReached: count >= limit && limit > 0,
    planLabel: user?.plan === "PRO" ? "Pro" : "Free Tier",
    firstName,
    initials,
    login,
    register,
    logout,
    refresh,
  };
}
