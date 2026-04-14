"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type AnalysisResponse,
  type AnalysisStatus,
  type ScoreResult,
  lookupCachedAnalysis,
  pollAnalysis,
  startAnalysis,
} from "@/lib/api"

export type WalletScorePhase =
  | "idle"
  | "submitting"
  | "polling"
  | "completed"
  | "error"

export interface WalletScoreState {
  phase: WalletScorePhase
  processId: string | null
  result: ScoreResult | null
  error: string | null
  backendStatus: AnalysisStatus | null
  fromCache: boolean
}

const POLL_INTERVAL_MS = 2_500
const MAX_POLL_ATTEMPTS = 60

const initialState: WalletScoreState = {
  phase: "idle",
  processId: null,
  result: null,
  error: null,
  backendStatus: null,
  fromCache: false,
}

export function useWalletScore(chain: string, address: string) {
  const [state, setState] = useState<WalletScoreState>(initialState)
  const pollCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    abortRef.current?.abort()
    abortRef.current = null
    pollCountRef.current = 0
    setState(initialState)
  }, [clearTimer])

  useEffect(() => {
    return () => {
      clearTimer()
      abortRef.current?.abort()
    }
  }, [clearTimer])

  const submit = useCallback(async (opts?: { force?: boolean }) => {
    if (!chain || !address) return

    clearTimer()
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    pollCountRef.current = 0

    setState({
      phase: "submitting",
      processId: null,
      result: null,
      error: null,
      backendStatus: null,
      fromCache: false,
    })

    try {
      // GET-first: verifica cache antes de criar nova análise
      if (!opts?.force) {
        const cached = await lookupCachedAnalysis(chain, address)

        if (controller.signal.aborted) return

        if (cached?.status === "completed" && cached.result) {
          setState({
            phase: "completed",
            processId: cached.processId,
            result: cached.result,
            error: null,
            backendStatus: "completed",
            fromCache: true,
          })
          return
        }

        if (cached?.status === "pending" || cached?.status === "processing") {
          setState((prev) => ({
            ...prev,
            phase: "polling",
            processId: cached.processId,
            backendStatus: cached.status as AnalysisStatus,
            fromCache: false,
          }))
          poll(cached.processId, controller)
          return
        }
      }

      // Miss ou force: cria nova análise
      const { processId } = await startAnalysis({ chain, address })

      if (controller.signal.aborted) return

      setState((prev) => ({
        ...prev,
        phase: "polling",
        processId,
        backendStatus: "pending",
      }))

      poll(processId, controller)
    } catch (err) {
      if (controller.signal.aborted) return
      setState((prev) => ({
        ...prev,
        phase: "error",
        error: err instanceof Error ? err.message : "Erro ao iniciar análise",
      }))
    }
  }, [chain, address, clearTimer])

  function poll(processId: string, controller: AbortController) {
    async function tick() {
      if (controller.signal.aborted) return

      if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: "Timeout: análise nao completou a tempo.",
        }))
        return
      }

      pollCountRef.current += 1

      try {
        const response: AnalysisResponse = await pollAnalysis(processId)

        if (controller.signal.aborted) return

        if (response.status === "completed" && response.result) {
          setState((prev) => ({
            ...prev,
            phase: "completed",
            result: response.result!,
            backendStatus: "completed",
          }))
          return
        }

        if (response.status === "failed") {
          setState((prev) => ({
            ...prev,
            phase: "error",
            backendStatus: "failed",
            error: response.error ?? "Erro no processamento da análise.",
          }))
          return
        }

        setState((prev) => ({
          ...prev,
          backendStatus: response.status,
        }))

        timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      } catch (err) {
        if (controller.signal.aborted) return
        setState((prev) => ({
          ...prev,
          phase: "error",
          error:
            err instanceof Error ? err.message : "Erro ao consultar status",
        }))
      }
    }

    tick()
  }

  return { ...state, submit, reset }
}
