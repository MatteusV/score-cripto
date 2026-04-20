export const ANALYSIS_EVENTS_EXCHANGE = "score-cripto.events";
export const ANALYSIS_STAGE_CHANGED_ROUTING_KEY = "analysis.stage.changed";
export const ANALYSIS_STAGE_CHANGED_EVENT_NAME = "analysis.stage.changed";
export const ANALYSIS_STAGE_SCHEMA_VERSION = "1";

export const ANALYSIS_STAGES = [
  "detect",
  "fetch",
  "normalize",
  "sanctions",
  "mixer",
  "ai",
  "score",
] as const;

export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

export const ANALYSIS_STAGE_STATES = [
  "started",
  "completed",
  "failed",
] as const;

export type AnalysisStageState = (typeof ANALYSIS_STAGE_STATES)[number];

export const ANALYSIS_STAGE_SERVICES = [
  "data-search",
  "process-data-ia",
  "api-gateway",
] as const;

export type AnalysisStageService = (typeof ANALYSIS_STAGE_SERVICES)[number];

export interface AnalysisStageChangedPayload {
  requestId: string;
  stage: AnalysisStage;
  state: AnalysisStageState;
  service: AnalysisStageService;
  at: string;
  errorMessage?: string;
}

export interface AnalysisStageChangedEnvelope {
  event: typeof ANALYSIS_STAGE_CHANGED_EVENT_NAME;
  schemaVersion: typeof ANALYSIS_STAGE_SCHEMA_VERSION;
  timestamp: string;
  data: AnalysisStageChangedPayload;
}
