import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateText = vi.fn();

vi.mock("ai", () => ({
  gateway: (slug: string) => slug,
  generateText: (args: unknown) => mockGenerateText(args),
  Output: {
    object: <T>(schema: T) => schema,
  },
}));

vi.mock("../observability/metrics.js", () => ({
  recordAiUsage: vi.fn(),
}));

const { scoreWithAI } = await import("./scoring.js");

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    chain: "ethereum",
    address: "0xabc",
    tx_count: 10,
    total_volume: 1,
    unique_counterparties: 3,
    wallet_age_days: 100,
    largest_tx_ratio: 0.2,
    avg_tx_value: 0.1,
    has_mixer_interaction: false,
    has_sanctioned_interaction: false,
    token_diversity: 2,
    nft_activity: false,
    defi_interactions: 1,
    risk_flags: [] as string[],
    ...overrides,
  } as Parameters<typeof scoreWithAI>[0];
}

function mockModelResponse(score: number) {
  mockGenerateText.mockResolvedValueOnce({
    output: {
      score,
      confidence: 0.9,
      reasoning: "model reasoning",
      positiveFactors: ["positive"],
      riskFactors: [],
    },
    usage: { totalTokens: 100, inputTokens: 60, outputTokens: 40 },
  });
}

describe("scoreWithAI — consistency guard-rail", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("clamps score when wallet has mixer interaction", async () => {
    mockModelResponse(95);
    const result = await scoreWithAI(
      baseInput({ has_mixer_interaction: true })
    );
    expect(result.output.score).toBe(60);
    expect(result.output.riskFactors).toContain(
      "score clamped by objective risk signals"
    );
  });

  it("clamps score when wallet has sanctioned interaction", async () => {
    mockModelResponse(100);
    const result = await scoreWithAI(
      baseInput({ has_sanctioned_interaction: true })
    );
    expect(result.output.score).toBe(60);
  });

  it("clamps score when wallet has 3+ risk flags", async () => {
    mockModelResponse(90);
    const result = await scoreWithAI(
      baseInput({ risk_flags: ["a", "b", "c"] })
    );
    expect(result.output.score).toBe(60);
  });

  it("does not clamp when risk signals are absent", async () => {
    mockModelResponse(85);
    const result = await scoreWithAI(baseInput());
    expect(result.output.score).toBe(85);
    expect(result.output.riskFactors).not.toContain(
      "score clamped by objective risk signals"
    );
  });

  it("does not clamp when score is already below the ceiling", async () => {
    mockModelResponse(40);
    const result = await scoreWithAI(
      baseInput({ has_mixer_interaction: true })
    );
    expect(result.output.score).toBe(40);
  });
});
