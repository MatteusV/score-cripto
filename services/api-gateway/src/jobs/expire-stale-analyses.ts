import { logger } from "../logger.js";
import { staleAnalysisExpiredCounter } from "../observability/metrics.js";
import type { AnalysisRequestRepository } from "../repositories/analysis-request-repository.js";

const STALE_REASON = "Analysis timed out — no response from scoring pipeline";

export async function expireStaleAnalyses(
  repository: AnalysisRequestRepository,
  thresholdMs: number
): Promise<number> {
  const olderThan = new Date(Date.now() - thresholdMs);
  const count = await repository.markStaleAsFailed(olderThan, STALE_REASON);
  if (count > 0) {
    staleAnalysisExpiredCounter.add(count);
    logger.warn(
      { count, olderThan },
      "Stale PENDING analyses marked as FAILED"
    );
  }
  return count;
}

export function startExpireJob(
  repository: AnalysisRequestRepository,
  thresholdMs: number,
  intervalMs: number
): NodeJS.Timeout {
  return setInterval(
    () => expireStaleAnalyses(repository, thresholdMs),
    intervalMs
  );
}
