import { analysisEventBus } from "../events/analysis-event-bus.js";
import { logger } from "../logger.js";
import { staleAnalysisExpiredCounter } from "../observability/metrics.js";
import type { AnalysisRequestRepository } from "../repositories/analysis-request-repository.js";

const STALE_REASON =
  "A análise excedeu o tempo limite sem resposta do pipeline de scoring";
const STALE_ERROR_CODE = "upstream_unreachable";

export async function expireStaleAnalyses(
  repository: AnalysisRequestRepository,
  thresholdMs: number
): Promise<number> {
  const olderThan = new Date(Date.now() - thresholdMs);
  const staleIds = await repository.findStaleIds(olderThan);

  if (staleIds.length === 0) {
    return 0;
  }

  let count = 0;
  for (const id of staleIds) {
    try {
      await repository.markFailed(id, STALE_REASON);
      analysisEventBus.emit(id, {
        status: "failed",
        stageState: "failed",
        error: STALE_REASON,
        errorCode: STALE_ERROR_CODE,
      });
      count++;
    } catch (err) {
      logger.error({ err, id }, "Failed to mark stale analysis as FAILED");
    }
  }

  staleAnalysisExpiredCounter.add(count);
  logger.warn(
    { count, olderThan },
    "Stale PENDING/PROCESSING analyses marked as FAILED"
  );
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
