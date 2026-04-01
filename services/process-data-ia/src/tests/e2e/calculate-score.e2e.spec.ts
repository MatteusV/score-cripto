import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createCalculateScoreForTesting } from "../../orchestrators/calculate-score";
import type { WalletContextInput } from "../../schemas/score";
import type { E2EDatabase } from "./helpers/e2e-database";
import { createE2EDatabase } from "./helpers/e2e-database";

const walletContext: WalletContextInput = {
  chain: "ethereum",
  address: "0xe2etest123",
  tx_count: 80,
  total_volume: 500,
  unique_counterparties: 15,
  wallet_age_days: 720,
  largest_tx_ratio: 0.2,
  avg_tx_value: 6,
  has_mixer_interaction: false,
  has_sanctioned_interaction: false,
  token_diversity: 8,
  nft_activity: true,
  defi_interactions: 5,
  risk_flags: [],
};

describe("CalculateScore E2E (AI Gateway)", () => {
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

  it("should call AI Gateway, persist AnalysisRequest and ProcessedData", async () => {
    const publishFn = vi.fn().mockReturnValue(true);
    const sut = createCalculateScoreForTesting({ publishFn });

    const result = await sut.execute({ walletContext, userId: "e2e-user-1" });

    expect(result.cachedResult).toBe(false);
    expect(result.processedData.score).toBeGreaterThanOrEqual(0);
    expect(result.processedData.score).toBeLessThanOrEqual(100);
    expect(result.processedData.confidence).toBeGreaterThan(0);
    expect(result.processedData.reasoning).toBeTruthy();
    // Aceita tanto o modelo do gateway quanto o heurístico (fallback legítimo em falha de rede)
    expect(result.processedData.modelVersion).toMatch(/openai\/gpt-5\.4-mini|heuristic-v1/);
    expect(result.processedData.userId).toBe("e2e-user-1");

    const analysisRows = await db.query("SELECT * FROM analysis_requests");
    expect(analysisRows.rowCount).toBe(1);
    expect(analysisRows.rows[0].status).toBe("COMPLETED");
    expect(analysisRows.rows[0].processing_at).not.toBeNull();
    expect(analysisRows.rows[0].completed_at).not.toBeNull();

    const processedRows = await db.query("SELECT * FROM processed_data");
    expect(processedRows.rowCount).toBe(1);
    expect(Number(processedRows.rows[0].score)).toBe(
      result.processedData.score
    );
    expect(processedRows.rows[0].user_id).toBe("e2e-user-1");

    expect(publishFn).toHaveBeenCalledOnce();
  }, 60_000);

  it("should return cached result on second call (no second AI call)", async () => {
    const publishFn = vi.fn().mockReturnValue(true);
    const sut = createCalculateScoreForTesting({ publishFn });

    const first = await sut.execute({ walletContext, userId: "e2e-user-1" });
    const second = await sut.execute({ walletContext, userId: "e2e-user-1" });

    expect(first.cachedResult).toBe(false);
    expect(second.cachedResult).toBe(true);
    expect(second.processedData.score).toBe(first.processedData.score);

    const rows = await db.query("SELECT * FROM analysis_requests");
    expect(rows.rowCount).toBe(1);

    expect(publishFn).toHaveBeenCalledOnce();
  }, 60_000);

  it("should isolate analysis requests between different users", async () => {
    const sut = createCalculateScoreForTesting({});

    await sut.execute({ walletContext, userId: "e2e-user-1" });

    await db.query("DELETE FROM processed_data");

    await sut.execute({ walletContext, userId: "e2e-user-2" });

    const rows = await db.query(
      "SELECT user_id FROM analysis_requests ORDER BY requested_at"
    );
    expect(rows.rowCount).toBe(2);
    expect(rows.rows[0].user_id).toBe("e2e-user-1");
    expect(rows.rows[1].user_id).toBe("e2e-user-2");
  }, 120_000);
});
