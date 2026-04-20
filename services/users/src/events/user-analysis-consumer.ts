import { z } from "zod/v4";
import { logger } from "../logger.js";
import { UsageLimitExceededError } from "../use-cases/errors/usage-limit-exceeded-error.js";
import { UserNotFoundError } from "../use-cases/errors/user-not-found-error.js";
import { makeConsumeUsageUseCase } from "../use-cases/factories/make-consume-usage-use-case.js";

const QUEUE_NAME = "users.user.analysis.consumed";
const ROUTING_KEY = "user.analysis.consumed";

export const UserAnalysisConsumedEventSchema = z.object({
  event: z.literal("user.analysis.consumed"),
  timestamp: z.string(),
  data: z.object({
    userId: z.string().min(1),
    analysisId: z.string().min(1),
    status: z.enum(["completed", "failed"]),
    chain: z.string().min(1),
    address: z.string().min(1),
  }),
});

export type UserAnalysisConsumedEvent = z.infer<typeof UserAnalysisConsumedEventSchema>;

export interface ProcessMessageResult {
  outcome: "processed" | "invalid_payload" | "limit_exceeded" | "user_not_found" | "error";
}

export async function processUserAnalysisConsumedMessage(
  raw: string,
  correlationId?: string,
): Promise<ProcessMessageResult> {
  const msgLog = correlationId ? logger.child({ correlationId }) : logger;

  let parsed: ReturnType<typeof UserAnalysisConsumedEventSchema.safeParse>;

  try {
    parsed = UserAnalysisConsumedEventSchema.safeParse(JSON.parse(raw));
  } catch {
    msgLog.error("Failed to parse message JSON");
    return { outcome: "invalid_payload" };
  }

  if (!parsed.success) {
    msgLog.error({ errors: parsed.error.flatten() }, "Invalid user.analysis.consumed payload");
    return { outcome: "invalid_payload" };
  }

  const { userId, analysisId, status } = parsed.data.data;

  if (status !== "completed") {
    msgLog.info({ analysisId, status }, "Skipping non-completed analysis event");
    return { outcome: "processed" };
  }

  msgLog.info({ userId, analysisId }, "user.analysis.consumed received");

  try {
    const useCase = makeConsumeUsageUseCase();
    await useCase.execute({ userId });
    msgLog.info({ userId }, "Usage consumed");
    return { outcome: "processed" };
  } catch (err) {
    if (err instanceof UsageLimitExceededError) {
      msgLog.warn({ userId }, "Usage limit already exceeded, acking anyway");
      return { outcome: "limit_exceeded" };
    }
    if (err instanceof UserNotFoundError) {
      msgLog.warn({ userId }, "User not found, skipping orphan event");
      return { outcome: "user_not_found" };
    }
    msgLog.error({ userId, err: (err as Error).message }, "Transient error processing event");
    return { outcome: "error" };
  }
}

export { QUEUE_NAME, ROUTING_KEY };
