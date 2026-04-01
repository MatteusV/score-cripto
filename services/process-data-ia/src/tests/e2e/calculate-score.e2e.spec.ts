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
import { scoreWithHeuristic } from "../../services/scoring";
import type { E2EDatabase } from "./helpers/e2e-database";
import { createE2EDatabase } from "./helpers/e2e-database";

// Heuristic como scoringFn — sem custo, sem rede, determinístico
const heuristicScoringFn = async (input: WalletContextInput) => ({
  output: scoreWithHeuristic(input),
  modelVersion: "heuristic-v1",
  promptVersion: "heuristic",
  tokensUsed: 0,
  cost: 0,
  durationMs: 0,
});

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

describe("CalculateScore E2E", () => {
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

  it("should persist AnalysisRequest and ProcessedData in real DB", async () => {
    const publishFn = vi.fn().mockReturnValue(true);
    const sut = createCalculateScoreForTesting({
      scoringFn: heuristicScoringFn,
      publishFn,
    });

    const result = await sut.execute({ walletContext, userId: "e2e-user-1" });

    expect(result.cachedResult).toBe(false);
    expect(result.processedData.score).toBeGreaterThanOrEqual(0);
    expect(result.processedData.score).toBeLessThanOrEqual(100);
    expect(result.processedData.modelVersion).toBe("heuristic-v1");
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
  });

  it("should return cached result on second call with same wallet context", async () => {
    const publishFn = vi.fn().mockReturnValue(true);
    const sut = createCalculateScoreForTesting({
      scoringFn: heuristicScoringFn,
      publishFn,
    });

    const first = await sut.execute({ walletContext, userId: "e2e-user-1" });
    const second = await sut.execute({ walletContext, userId: "e2e-user-1" });

    expect(first.cachedResult).toBe(false);
    expect(second.cachedResult).toBe(true);
    expect(second.processedData.score).toBe(first.processedData.score);

    // Apenas 1 AnalysisRequest criado no banco
    const rows = await db.query("SELECT * FROM analysis_requests");
    expect(rows.rowCount).toBe(1);

    // publishFn chamado apenas na primeira vez
    expect(publishFn).toHaveBeenCalledOnce();
  });

  it("should isolate scores between different users for same wallet", async () => {
    const sut = createCalculateScoreForTesting({
      scoringFn: heuristicScoringFn,
    });

    await sut.execute({
      walletContext,
      userId: "e2e-user-1",
    });

    // Limpa cache para forçar novo cálculo para user-2
    await db.query("DELETE FROM processed_data");

    await sut.execute({
      walletContext,
      userId: "e2e-user-2",
    });

    const rows = await db.query(
      "SELECT user_id FROM analysis_requests ORDER BY requested_at"
    );
    expect(rows.rowCount).toBe(2);
    expect(rows.rows[0].user_id).toBe("e2e-user-1");
    expect(rows.rows[1].user_id).toBe("e2e-user-2");
  });
});
