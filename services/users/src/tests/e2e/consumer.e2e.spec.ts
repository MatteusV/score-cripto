import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { processUserAnalysisConsumedMessage } from "../../events/user-analysis-consumer";
import { createHttpServer } from "../../http/server";
import type { E2EDatabase } from "./helpers/e2e-database";
import { createE2EDatabase } from "./helpers/e2e-database";

async function registerUser(
  // biome-ignore lint/suspicious/noExplicitAny: fastify instance type in e2e context
  app: any,
  email: string
): Promise<string> {
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
  // biome-ignore lint/suspicious/noExplicitAny: fastify instance type in e2e context
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

  it("deve incrementar analysisCount ao processar evento completed", async () => {
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

  it("não deve incrementar para evento com status failed", async () => {
    const userId = await registerUser(app, "consumer-failed@example.com");

    const result = await processUserAnalysisConsumedMessage(
      makeConsumedEvent(userId, "analysis-fail", "failed")
    );

    expect(result.outcome).toBe("processed");

    const rows = await db.query(
      `SELECT "analysisCount" FROM "${db.getSchema()}"."usage_records" WHERE "userId" = '${userId}'`
    );
    // RegisterUserUseCase cria UsageRecord com analysisCount=0 no registro
    // O consumer não deve ter incrementado (status=failed é ignorado)
    expect(rows.rowCount).toBe(1);
    expect(Number(rows.rows[0].analysisCount)).toBe(0);
  });

  it("deve retornar limit_exceeded quando limite já atingido (ack silencioso)", async () => {
    const userId = await registerUser(app, "consumer-limit@example.com");

    // Consome todas as 5 análises via HTTP
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/usage/consume",
        payload: { userId, analysisId: `analysis-${i}` },
      });
    }

    // Consumer recebe mais um evento — deve retornar limit_exceeded sem erro
    const result = await processUserAnalysisConsumedMessage(
      makeConsumedEvent(userId, "analysis-over")
    );

    expect(result.outcome).toBe("limit_exceeded");
  });

  it("deve retornar invalid_payload para JSON inválido", async () => {
    const result = await processUserAnalysisConsumedMessage("not-json");
    expect(result.outcome).toBe("invalid_payload");
  });

  it("deve retornar invalid_payload para payload com event type errado", async () => {
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
