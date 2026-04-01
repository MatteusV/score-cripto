import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  processWalletDataCachedMessage,
  USER_PLAN_LIMITS,
} from "../../events/consumer";
import type { WalletContextInput } from "../../schemas/score";
import { scoreWithHeuristic } from "../../services/scoring";
import type { E2EDatabase } from "./helpers/e2e-database";
import { createE2EDatabase } from "./helpers/e2e-database";

const heuristicScoringFn = async (input: WalletContextInput) => ({
  output: scoreWithHeuristic(input),
  modelVersion: "heuristic-v1",
  promptVersion: "heuristic",
  tokensUsed: 0,
  cost: 0,
  durationMs: 0,
});

vi.mock("../../services/scoring", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services/scoring")>();
  return { ...real, scoreWithAI: heuristicScoringFn };
});

vi.mock("../../events/publisher", () => ({
  publishScoreCalculated: vi.fn().mockReturnValue(true),
  publishQuotaExceeded: vi.fn().mockReturnValue(true),
}));

const baseWalletContext: WalletContextInput = {
  chain: "ethereum",
  address: "0xcons-test-001",
  tx_count: 50,
  total_volume: 200,
  unique_counterparties: 10,
  wallet_age_days: 365,
  largest_tx_ratio: 0.3,
  avg_tx_value: 4,
  has_mixer_interaction: false,
  has_sanctioned_interaction: false,
  token_diversity: 5,
  nft_activity: false,
  defi_interactions: 2,
  risk_flags: [],
};

function makeEvent(
  userId: string,
  userPlan: "FREE_TIER" | "PRO" = "FREE_TIER",
  walletContext: WalletContextInput = baseWalletContext
): string {
  return JSON.stringify({
    event: "wallet.data.cached",
    timestamp: new Date().toISOString(),
    data: { userId, userPlan, walletContext },
  });
}

describe("Consumer E2E — processWalletDataCachedMessage", () => {
  let db: E2EDatabase;

  beforeAll(async () => {
    db = createE2EDatabase();
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
    await db.cleanup();
  });

  it("should process a valid event and persist score in DB", async () => {
    const result = await processWalletDataCachedMessage(
      makeEvent("consumer-user-1")
    );

    expect(result.outcome).toBe("processed");

    const analysisRows = await db.query("SELECT * FROM analysis_requests");
    expect(analysisRows.rowCount).toBe(1);
    expect(analysisRows.rows[0].status).toBe("COMPLETED");

    const scoreRows = await db.query("SELECT * FROM processed_data");
    expect(scoreRows.rowCount).toBe(1);
    expect(Number(scoreRows.rows[0].score)).toBeGreaterThanOrEqual(0);
    expect(scoreRows.rows[0].wallet_context_hash).toBeTruthy();
  });

  it("should return invalid_payload for malformed event", async () => {
    const result = await processWalletDataCachedMessage(
      JSON.stringify({ event: "wallet.data.cached", data: {} })
    );

    expect(result.outcome).toBe("invalid_payload");

    const rows = await db.query("SELECT * FROM analysis_requests");
    expect(rows.rowCount).toBe(0);
  });

  it("should return quota_exceeded when FREE_TIER user hits limit", async () => {
    const userId = "quota-user-free";
    const limit = USER_PLAN_LIMITS.FREE_TIER;

    for (let i = 0; i < limit; i++) {
      const ctx = { ...baseWalletContext, address: `0xquota-free-${i}` };
      await processWalletDataCachedMessage(makeEvent(userId, "FREE_TIER", ctx));
    }

    const result = await processWalletDataCachedMessage(
      makeEvent(userId, "FREE_TIER", {
        ...baseWalletContext,
        address: "0xquota-free-over",
      })
    );

    expect(result.outcome).toBe("quota_exceeded");
  });

  it("should return quota_exceeded when PRO user hits limit", async () => {
    const userId = "quota-user-pro";
    const limit = USER_PLAN_LIMITS.PRO;

    for (let i = 0; i < limit; i++) {
      const ctx = { ...baseWalletContext, address: `0xquota-pro-${i}` };
      await processWalletDataCachedMessage(makeEvent(userId, "PRO", ctx));
    }

    const result = await processWalletDataCachedMessage(
      makeEvent(userId, "PRO", {
        ...baseWalletContext,
        address: "0xquota-pro-over",
      })
    );

    expect(result.outcome).toBe("quota_exceeded");
  });

  it("should return cached result on second call with same wallet context", async () => {
    const userId = "cache-user-1";

    const first = await processWalletDataCachedMessage(makeEvent(userId));
    const second = await processWalletDataCachedMessage(makeEvent(userId));

    expect(first.outcome).toBe("processed");
    expect(second.outcome).toBe("processed");

    // Only 1 AnalysisRequest should be created (cache hit on second call)
    const rows = await db.query("SELECT * FROM analysis_requests");
    expect(rows.rowCount).toBe(1);
  });

  it("should isolate quotas per user", async () => {
    const limit = USER_PLAN_LIMITS.FREE_TIER;

    for (let i = 0; i < limit; i++) {
      const ctx = { ...baseWalletContext, address: `0xiso-user1-${i}` };
      await processWalletDataCachedMessage(
        makeEvent("iso-user-1", "FREE_TIER", ctx)
      );
    }

    // user-2 should still be within quota
    const result = await processWalletDataCachedMessage(
      makeEvent("iso-user-2", "FREE_TIER")
    );
    expect(result.outcome).toBe("processed");
  });
});
