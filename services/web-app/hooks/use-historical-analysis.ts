"use client"

import { useEffect, useState } from "react"
import { type ScoreResult, getAnalysisByPublicId } from "@/lib/api"

export type HistoricalAnalysisPhase = "loading" | "completed" | "error"

export interface HistoricalAnalysisState {
  phase: HistoricalAnalysisPhase
  result: ScoreResult | null
  chain: string | null
  address: string | null
  error: string | null
}

export function useHistoricalAnalysis(publicId: number) {
  const [state, setState] = useState<HistoricalAnalysisState>({
    phase: "loading",
    result: null,
    chain: null,
    address: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getAnalysisByPublicId(publicId)

        if (cancelled) return

        if (data.status === "completed" && data.result) {
          setState({
            phase: "completed",
            result: data.result,
            chain: data.chain,
            address: data.address,
            error: null,
          })
        } else {
          setState({
            phase: "error",
            result: null,
            chain: data.chain,
            address: data.address,
            error: "Análise ainda não foi concluída.",
          })
        }
      } catch (err) {
        if (cancelled) return
        setState({
          phase: "error",
          result: null,
          chain: null,
          address: null,
          error: err instanceof Error ? err.message : "Erro ao carregar análise.",
        })
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [publicId])

  return state
}
