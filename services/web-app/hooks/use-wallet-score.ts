"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AnalysisResponse,
  type AnalysisStage,
  type AnalysisStageState,
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
  currentStage: AnalysisStage | null;
  error: string | null;
  errorCode: string | null;
  fromCache: boolean;
  phase: WalletScorePhase;
  processId: string | null;
  result: ScoreResult | null;
  stageState: AnalysisStageState | null;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 60;
const SSE_SUPPORTED = typeof EventSource !== "undefined";

const initialState: WalletScoreState = {
  phase: "idle",
  processId: null,
  result: null,
  error: null,
  errorCode: null,
  backendStatus: null,
  fromCache: false,
  currentStage: null,
  stageState: null,
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
            errorCode: "timeout",
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
              errorCode: "internal_error",
            }));
            return;
          }

          setState((prev) => ({
            ...prev,
            backendStatus: response.status,
            currentStage: response.currentStage ?? prev.currentStage,
            stageState: response.stageState ?? prev.stageState,
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
            errorCode: "upstream_unreachable",
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
          const data = JSON.parse(e.data) as {
            status: AnalysisStatus;
            currentStage?: AnalysisStage | null;
            stageState?: AnalysisStageState | null;
          };
          setState((prev) => ({
            ...prev,
            backendStatus: data.status,
            currentStage: data.currentStage ?? prev.currentStage,
            stageState: data.stageState ?? prev.stageState,
          }));
        } catch {
          /* ignora parse error de status intermediário */
        }
      });

      es.addEventListener("stage", (e: MessageEvent) => {
        if (controller.signal.aborted) {
          return;
        }
        try {
          const data = JSON.parse(e.data) as {
            status?: AnalysisStatus;
            stage?: AnalysisStage;
            stageState?: AnalysisStageState;
          };
          setState((prev) => ({
            ...prev,
            backendStatus: data.status ?? prev.backendStatus,
            currentStage: data.stage ?? prev.currentStage,
            stageState: data.stageState ?? prev.stageState,
          }));
        } catch {
          /* ignora parse error de stage update */
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
            errorCode?: string;
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
              errorCode: data.errorCode ?? "internal_error",
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
        errorCode: null,
        backendStatus: null,
        fromCache: false,
        currentStage: null,
        stageState: null,
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
              errorCode: null,
              backendStatus: "completed",
              fromCache: true,
              currentStage: "score",
              stageState: "completed",
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
          errorCode: "upstream_unreachable",
        }));
      }
    },
    [chain, address, clearTimer, poll]
  );

  return { ...state, submit, reset };
}
