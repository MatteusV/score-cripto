"use client"

import { useCallback, useEffect, useState } from "react"

export interface ExploreWallet {
  chain: string
  address: string
  score: number
  confidence: number | null
  lookups: number
  lastAnalyzedAt: string
  reasoning: string | null
  riskFactors: string[]
}

export interface ExploreRecent {
  id: string
  publicId: number | null
  chain: string
  address: string
  score: number | null
  requestedAt: string
}

export interface ExploreChainDistribution {
  chain: string
  pct: number
  count: number
}

export interface ExploreStats {
  totalAnalyses: number
  uniqueAddresses: number
  chains: number
  risky: number
}

export interface ExploreCategory {
  id: string
  count: number
}

export interface ExploreData {
  trending: ExploreWallet[]
  risk: ExploreWallet[]
  leaderboard: ExploreWallet[]
  recent: ExploreRecent[]
  chainDistribution: ExploreChainDistribution[]
  categories: ExploreCategory[]
  stats: ExploreStats
}

const EMPTY: ExploreData = {
  trending: [],
  risk: [],
  leaderboard: [],
  recent: [],
  chainDistribution: [],
  categories: [],
  stats: { totalAnalyses: 0, uniqueAddresses: 0, chains: 0, risky: 0 },
}

export function useExplore() {
  const [data, setData] = useState<ExploreData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/explore")
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? "Erro ao carregar dados")
        return
      }
      const body = (await res.json()) as ExploreData
      setData(body)
    } catch {
      setError("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
  }, [fetch_])

  return { data, loading, error, refetch: fetch_ }
}
