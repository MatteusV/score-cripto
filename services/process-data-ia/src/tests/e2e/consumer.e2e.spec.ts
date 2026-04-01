import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { processWalletDataCachedMessage } from "../../events/consumer";
import type { WalletContextInput } from "../../schemas/score";
import type { E2EDatabase } from "./helpers/e2e-database";
import { createE2EDatabase } from "./helpers/e2e-database";

vi.mock("../../services/scoring", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services/scoring")>();
  return {
    ...real,
    scoreWithAI: async (input: Parameters<typeof real.scoreWithAI>[0]) => ({
      output: real.scoreWithHeuristic(input),
      modelVersion: "heuristic-v1",
      promptVersion: "heuristic",
      tokensUsed: 0,
      cost: 0,
      durationMs: 0,
    }),
  };
});

vi.mock("../../events/publisher", () => ({
  publishScoreCalculated: vi.fn().mockReturnValue(true),
  connectRabbitMQ: vi.fn(),
  disconnectRabbitMQ: vi.fn(),
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
  walletContext: WalletContextInput = baseWalletContext
): string {
  return JSON.stringify({
    event: "wallet.data.cached",
    timestamp: new Date().toISOString(),
    data: { userId, walletContext },
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

  it("should return cached result on second call with same wallet context", async () => {
    await processWalletDataCachedMessage(makeEvent("cache-user-1"));
    const second = await processWalletDataCachedMessage(
      makeEvent("cache-user-1")
    );

    expect(second.outcome).toBe("processed");

    // Only 1 AnalysisRequest created — second call hit cache
    const rows = await db.query("SELECT * FROM analysis_requests");
    expect(rows.rowCount).toBe(1);
  });

  it("should process independently for different users", async () => {
    const resultA = await processWalletDataCachedMessage(makeEvent("user-a"));
    const resultB = await processWalletDataCachedMessage(makeEvent("user-b"));

    expect(resultA.outcome).toBe("processed");
    expect(resultB.outcome).toBe("processed");

    // Score é compartilhado entre usuários (design intencional):
    // user-b acerta o cache gerado por user-a — apenas 1 AnalysisRequest criado
    const rows = await db.query(
      "SELECT user_id FROM analysis_requests ORDER BY requested_at"
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].user_id).toBe("user-a");

    // ProcessedData compartilhada entre os dois usuários
    const scoreRows = await db.query("SELECT * FROM processed_data");
    expect(scoreRows.rowCount).toBe(1);
  });
});
