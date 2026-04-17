import { EventEmitter } from "node:events";

/**
 * Bus in-process para notificar conexões SSE quando uma análise termina.
 *
 * Cada analysis ID é um evento — SSE listeners registram `.once(id, handler)`.
 * O consumer emite quando `wallet.score.calculated` ou `wallet.score.failed` chega.
 */

export interface AnalysisDoneEvent {
  error?: string;
  result?: {
    score: number;
    confidence: number;
    reasoning: string;
    positiveFactors: string[];
    riskFactors: string[];
    modelVersion: string;
    promptVersion: string;
  };
  status: "completed" | "failed";
}

class AnalysisEventBus extends EventEmitter {
  emit(id: string, event: AnalysisDoneEvent): boolean {
    return super.emit(id, event);
  }

  once(id: string, listener: (event: AnalysisDoneEvent) => void): this {
    return super.once(id, listener);
  }

  off(id: string, listener: (event: AnalysisDoneEvent) => void): this {
    return super.off(id, listener);
  }
}

export const analysisEventBus = new AnalysisEventBus();
// Suporta muitas conexões SSE simultâneas sem warning de memory leak
analysisEventBus.setMaxListeners(1000);
