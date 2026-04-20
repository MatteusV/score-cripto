import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AnalysisResponse,
  ApiError,
  pollAnalysis,
  type StartAnalysisResponse,
  startAnalysis,
} from "./api";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("startAnalysis", () => {
  it("POSTs chain and address and returns processId", async () => {
    const body: StartAnalysisResponse = { processId: "proc-abc-123" };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    const result = await startAnalysis({
      chain: "ethereum",
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });

    expect(result).toEqual(body);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          chain: "ethereum",
          address: "0x1234567890abcdef1234567890abcdef12345678",
        }),
      })
    );
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("rate limited", { status: 429 })
    );

    await expect(
      startAnalysis({ chain: "ethereum", address: "0xabc" })
    ).rejects.toThrow(ApiError);

    await expect(
      startAnalysis({ chain: "ethereum", address: "0xabc" }).catch((e) => {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(429);
        throw e;
      })
    ).rejects.toThrow();
  });
});

describe("pollAnalysis", () => {
  it("GETs the process status by id", async () => {
    const body: AnalysisResponse = {
      status: "completed",
      processId: "proc-abc-123",
      chain: "ethereum",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      result: {
        score: 78,
        confidence: 0.92,
        reasoning: "Carteira com histórico longo e diversificado.",
        positiveFactors: [
          "Idade da carteira acima de 3 anos",
          "Diversidade de contrapartes alta",
        ],
        riskFactors: ["Interacao com mixer detectada"],
        modelVersion: "gpt-4o-2024-08",
        promptVersion: "v2.1.0",
      },
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    const result = await pollAnalysis("proc-abc-123");

    expect(result).toEqual(body);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/analyze/proc-abc-123",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("returns pending status when analysis is still running", async () => {
    const body: AnalysisResponse = {
      status: "processing",
      processId: "proc-abc-123",
      chain: "ethereum",
      address: "0xabc",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    const result = await pollAnalysis("proc-abc-123");
    expect(result.status).toBe("processing");
    expect(result.result).toBeUndefined();
  });

  it("encodes processId in URL", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: "pending",
        processId: "a/b c",
        chain: "ethereum",
        address: "",
      })
    );

    await pollAnalysis("a/b c");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/analyze/a%2Fb%20c",
      expect.anything()
    );
  });
});
