import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { processUserAnalysisConsumedMessage } from "../../events/user-analysis-consumer.js";
import { createHttpServer } from "../../http/server.js";
import type { E2EDatabase } from "./helpers/e2e-database.js";
import { createE2EDatabase } from "./helpers/e2e-database.js";

async function registerUser(app: any, email: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "senha1234" },
  });
  return (res.json() as { id: string }).id;
}

function makeConsumedEvent(
  userId: string,
  analysisId = "analysis-e2e-1",
  status: "completed" | "failed" = "completed"
): string {
  return JSON.stringify({
    event: "user.analysis.consumed",
    timestamp: new Date().toISOString(),
    data: {
      userId,
      analysisId,
      status,
      chain: "ethereum",
      address: "0xe2e-test",
    },
  });
}

describe("Consumer E2E — processUserAnalysisConsumedMessage", () => {
  let db: E2EDatabase;
  let app: any;

  beforeAll(async () => {
    db = createE2EDatabase();
    await db.connect();
    app = await createHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await db.disconnect();
  });

  beforeEach(async () => {
    await db.cleanup();
  });

  it("should increment analysisCount when processing completed event", async () => {
    const userId = await registerUser(app, "consumer-ok@example.com");

    const result = await processUserAnalysisConsumedMessage(
      makeConsumedEvent(userId)
    );

    expect(result.outcome).toBe("processed");

    const rows = await db.query(
      `SELECT "analysisCount" FROM "${db.getSchema()}"."usage_records" WHERE "userId" = '${userId}'`
    );
    expect(rows.rowCount).toBe(1);
    expect(Number(rows.rows[0].analysisCount)).toBe(1);
  });

  it("should not increment for event with status failed", async () => {
    const userId = await registerUser(app, "consumer-failed@example.com");

    const result = await processUserAnalysisConsumedMessage(
      makeConsumedEvent(userId, "analysis-fail", "failed")
    );

    expect(result.outcome).toBe("processed");

    const rows = await db.query(
      `SELECT "analysisCount" FROM "${db.getSchema()}"."usage_records" WHERE "userId" = '${userId}'`
    );
    // RegisterUserUseCase creates UsageRecord with analysisCount=0
    // Consumer should not have incremented (status=failed is ignored)
    expect(rows.rowCount).toBe(1);
    expect(Number(rows.rows[0].analysisCount)).toBe(0);
  });

  it("should return limit_exceeded when limit already reached (silent ack)", async () => {
    const userId = await registerUser(app, "consumer-limit@example.com");

    // Consume all 5 analyses via HTTP
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/usage/consume",
        payload: { userId, analysisId: `analysis-${i}` },
      });
    }

    // Consumer receives one more event — should return limit_exceeded without error
    const result = await processUserAnalysisConsumedMessage(
      makeConsumedEvent(userId, "analysis-over")
    );

    expect(result.outcome).toBe("limit_exceeded");
  });

  it("should return invalid_payload for invalid JSON", async () => {
    const result = await processUserAnalysisConsumedMessage("not-json");
    expect(result.outcome).toBe("invalid_payload");
  });

  it("should return invalid_payload for payload with wrong event type", async () => {
    const raw = JSON.stringify({
      event: "wallet.score.calculated",
      timestamp: new Date().toISOString(),
      data: {
        userId: "u-1",
        analysisId: "a-1",
        status: "completed",
        chain: "ETH",
        address: "0x1",
      },
    });
    const result = await processUserAnalysisConsumedMessage(raw);
    expect(result.outcome).toBe("invalid_payload");
  });
});
