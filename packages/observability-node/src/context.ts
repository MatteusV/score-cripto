import { AsyncLocalStorage } from "node:async_hooks";

export interface ObsContext {
  correlationId: string;
  requestId?: string;
}

export const observabilityStorage = new AsyncLocalStorage<ObsContext>();

export function getCorrelationId(): string | undefined {
  return observabilityStorage.getStore()?.correlationId;
}
