import { z } from "zod/v4";
import { UsageLimitExceededError } from "../use-cases/errors/usage-limit-exceeded-error.js";
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

export type UserAnalysisConsumedEvent = z.infer<
  typeof UserAnalysisConsumedEventSchema
>;

export interface ProcessMessageResult {
  outcome: "processed" | "invalid_payload" | "limit_exceeded" | "error";
}

export async function processUserAnalysisConsumedMessage(
  raw: string
): Promise<ProcessMessageResult> {
  let parsed: ReturnType<typeof UserAnalysisConsumedEventSchema.safeParse>;

  try {
    parsed = UserAnalysisConsumedEventSchema.safeParse(JSON.parse(raw));
  } catch {
    console.error("[users][Consumer] Failed to parse message JSON");
    return { outcome: "invalid_payload" };
  }

  if (!parsed.success) {
    console.error(
      "[users][Consumer] Invalid event payload:",
      parsed.error.flatten()
    );
    return { outcome: "invalid_payload" };
  }

  const { userId, analysisId, status } = parsed.data.data;

  // Só contabiliza análises completadas com sucesso
  if (status !== "completed") {
    console.log(
      `[users][Consumer] Skipping non-completed analysis ${analysisId} (status=${status})`
    );
    return { outcome: "processed" };
  }

  console.log(
    `[users][Consumer] Processing user.analysis.consumed | userId=${userId} analysisId=${analysisId}`
  );

  try {
    const useCase = makeConsumeUsageUseCase();
    await useCase.execute({ userId });
    console.log(`[users][Consumer] Usage consumed for userId=${userId}`);
    return { outcome: "processed" };
  } catch (err) {
    if (err instanceof UsageLimitExceededError) {
      // Limite já atingido — consumir silenciosamente (análise já foi feita)
      console.warn(
        `[users][Consumer] Usage limit already exceeded for userId=${userId}, acking anyway`
      );
      return { outcome: "limit_exceeded" };
    }
    console.error(
      "[users][Consumer] Transient error processing event:",
      (err as Error).message
    );
    return { outcome: "error" };
  }
}

export { QUEUE_NAME, ROUTING_KEY };
