"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AnalysisResponse,
  type AnalysisStatus,
  lookupCachedAnalysis,
  pollAnalysis,
  type ScoreResult,
  startAnalysis,
} from "@/lib/api";

export type WalletScorePhase =
  | "idle"
  | "submitting"
  | "polling" // aguardando resultado (SSE ou HTTP polling)
  | "completed"
  | "error";

export interface WalletScoreState {
  backendStatus: AnalysisStatus | null;
  error: string | null;
  fromCache: boolean;
  phase: WalletScorePhase;
  processId: string | null;
  result: ScoreResult | null;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 60;
const SSE_SUPPORTED = typeof EventSource !== "undefined";

const initialState: WalletScoreState = {
  phase: "idle",
  processId: null,
  result: null,
  error: null,
  backendStatus: null,
  fromCache: false,
};

export function useWalletScore(chain: string, address: string) {
  const [state, setState] = useState<WalletScoreState>(initialState);
  const pollCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    abortRef.current?.abort();
    abortRef.current = null;
    pollCountRef.current = 0;
    setState(initialState);
  }, [clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      abortRef.current?.abort();
    },
    [clearTimer]
  );

  const pollHTTP = useCallback(
    (processId: string, controller: AbortController) => {
      async function tick() {
        if (controller.signal.aborted) {
          return;
        }

        if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
          setState((prev) => ({
            ...prev,
            phase: "error",
            error: "Timeout: análise não completou a tempo.",
          }));
          return;
        }

        pollCountRef.current += 1;

        try {
          const response: AnalysisResponse = await pollAnalysis(processId);

          if (controller.signal.aborted) {
            return;
          }

          if (response.status === "completed" && response.result) {
            setState((prev) => ({
              ...prev,
              phase: "completed",
              result: response.result!,
              backendStatus: "completed",
            }));
            return;
          }

          if (response.status === "failed") {
            setState((prev) => ({
              ...prev,
              phase: "error",
              backendStatus: "failed",
              error: response.error ?? "Erro no processamento da análise.",
            }));
            return;
          }

          setState((prev) => ({
            ...prev,
            backendStatus: response.status,
          }));

          timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        } catch (err) {
          if (controller.signal.aborted) {
            return;
          }
          setState((prev) => ({
            ...prev,
            phase: "error",
            error:
              err instanceof Error ? err.message : "Erro ao consultar status",
          }));
        }
      }

      tick();
    },
    []
  );

  const connectSSE = useCallback(
    (processId: string, controller: AbortController) => {
      if (controller.signal.aborted) {
        return;
      }

      const es = new EventSource(`/api/analyze/${processId}/stream`);

      const cleanup = () => {
        es.close();
      };

      controller.signal.addEventListener("abort", cleanup, { once: true });

      es.addEventListener("status", (e: MessageEvent) => {
        if (controller.signal.aborted) {
          return;
        }
        try {
          const data = JSON.parse(e.data) as { status: AnalysisStatus };
          setState((prev) => ({ ...prev, backendStatus: data.status }));
        } catch {
          /* ignora parse error de status intermediário */
        }
      });

      es.addEventListener("result", (e: MessageEvent) => {
        if (controller.signal.aborted) {
          return;
        }
        try {
          const data = JSON.parse(e.data) as {
            status: "completed" | "failed";
            result?: ScoreResult;
            error?: string;
          };

          cleanup();

          if (data.status === "completed" && data.result) {
            setState((prev) => ({
              ...prev,
              phase: "completed",
              result: data.result!,
              backendStatus: "completed",
            }));
          } else {
            setState((prev) => ({
              ...prev,
              phase: "error",
              backendStatus: "failed",
              error: data.error ?? "Erro no processamento da análise.",
            }));
          }
        } catch {
          /* ignora parse error */
        }
      });

      es.addEventListener("timeout", () => {
        // SSE expirou no servidor — cai para polling HTTP
        cleanup();
        if (!controller.signal.aborted) {
          pollHTTP(processId, controller);
        }
      });

      es.onerror = () => {
        // Conexão SSE falhou — fallback para polling HTTP
        cleanup();
        if (!controller.signal.aborted) {
          pollHTTP(processId, controller);
        }
      };
    },
    [pollHTTP]
  );

  const poll = useCallback(
    (processId: string, controller: AbortController) => {
      // Tenta SSE primeiro; cai de volta em polling HTTP se não suportado ou falhar
      if (SSE_SUPPORTED) {
        connectSSE(processId, controller);
      } else {
        pollHTTP(processId, controller);
      }
    },
    [connectSSE, pollHTTP]
  );

  const submit = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!(chain && address)) {
        return;
      }

      clearTimer();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      pollCountRef.current = 0;

      setState({
        phase: "submitting",
        processId: null,
        result: null,
        error: null,
        backendStatus: null,
        fromCache: false,
      });

      try {
        // GET-first: verifica cache antes de criar nova análise
        if (!opts?.force) {
          const cached = await lookupCachedAnalysis(chain, address);

          if (controller.signal.aborted) {
            return;
          }

          if (cached?.status === "completed" && cached.result) {
            setState({
              phase: "completed",
              processId: cached.processId,
              result: cached.result,
              error: null,
              backendStatus: "completed",
              fromCache: true,
            });
            return;
          }

          if (cached?.status === "pending" || cached?.status === "processing") {
            setState((prev) => ({
              ...prev,
              phase: "polling",
              processId: cached.processId,
              backendStatus: cached.status as AnalysisStatus,
              fromCache: false,
            }));
            poll(cached.processId, controller);
            return;
          }
        }

        // Miss ou force: cria nova análise
        const { processId } = await startAnalysis({ chain, address });

        if (controller.signal.aborted) {
          return;
        }

        setState((prev) => ({
          ...prev,
          phase: "polling",
          processId,
          backendStatus: "pending",
        }));

        poll(processId, controller);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: err instanceof Error ? err.message : "Erro ao iniciar análise",
        }));
      }
    },
    [chain, address, clearTimer, poll]
  );

  return { ...state, submit, reset };
}
