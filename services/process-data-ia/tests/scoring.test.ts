import { describe, expect, it } from "vitest";
import {
  ScoreOutputSchema,
  WalletContextInputSchema,
} from "../src/schemas/score.js";
import { scoreWithHeuristic } from "../src/services/scoring.js";
import { createMockWalletContext, createRiskyWalletContext } from "./setup.js";

describe("Heuristic Scoring", () => {
  it("should return a score between 0 and 100", () => {
    const input = createMockWalletContext();
    const result = scoreWithHeuristic(input);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("should return confidence between 0 and 1", () => {
    const input = createMockWalletContext();
    const result = scoreWithHeuristic(input);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("should conform to ScoreOutput schema", () => {
    const input = createMockWalletContext();
    const result = scoreWithHeuristic(input);
    const parsed = ScoreOutputSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("should give a high score to a healthy wallet", () => {
    const input = createMockWalletContext();
    const result = scoreWithHeuristic(input);
    expect(result.score).toBeGreaterThan(70);
    expect(result.positiveFactors.length).toBeGreaterThan(0);
    expect(result.riskFactors.length).toBe(0);
  });

  it("should give a low score to a risky wallet", () => {
    const input = createRiskyWalletContext();
    const result = scoreWithHeuristic(input);
    expect(result.score).toBeLessThan(30);
    expect(result.riskFactors.length).toBeGreaterThan(0);
  });

  it("should penalize mixer interactions", () => {
    const clean = createMockWalletContext({ has_mixer_interaction: false });
    const mixer = createMockWalletContext({ has_mixer_interaction: true });
    const cleanScore = scoreWithHeuristic(clean);
    const mixerScore = scoreWithHeuristic(mixer);
    expect(mixerScore.score).toBeLessThan(cleanScore.score);
    expect(mixerScore.riskFactors).toContain(
      "Interaction with known mixer services"
    );
  });

  it("should penalize sanctioned interactions", () => {
    const clean = createMockWalletContext({
      has_sanctioned_interaction: false,
    });
    const sanctioned = createMockWalletContext({
      has_sanctioned_interaction: true,
    });
    const cleanScore = scoreWithHeuristic(clean);
    const sanctionedScore = scoreWithHeuristic(sanctioned);
    expect(sanctionedScore.score).toBeLessThan(cleanScore.score);
    expect(sanctionedScore.riskFactors).toContain(
      "Interaction with sanctioned addresses"
    );
  });

  it("should reward older wallets", () => {
    const young = createMockWalletContext({ wallet_age_days: 3 });
    const old = createMockWalletContext({ wallet_age_days: 500 });
    const youngScore = scoreWithHeuristic(young);
    const oldScore = scoreWithHeuristic(old);
    expect(oldScore.score).toBeGreaterThan(youngScore.score);
  });

  it("should reward high transaction count", () => {
    const low = createMockWalletContext({ tx_count: 1 });
    const high = createMockWalletContext({ tx_count: 200 });
    const lowScore = scoreWithHeuristic(low);
    const highScore = scoreWithHeuristic(high);
    expect(highScore.score).toBeGreaterThan(lowScore.score);
  });

  it("should penalize high largest_tx_ratio", () => {
    const balanced = createMockWalletContext({ largest_tx_ratio: 0.1 });
    const concentrated = createMockWalletContext({ largest_tx_ratio: 0.9 });
    const balancedScore = scoreWithHeuristic(balanced);
    const concentratedScore = scoreWithHeuristic(concentrated);
    expect(concentratedScore.score).toBeLessThan(balancedScore.score);
  });

  it("should penalize risk flags", () => {
    const clean = createMockWalletContext({ risk_flags: [] });
    const flagged = createMockWalletContext({
      risk_flags: ["suspicious_pattern", "unusual_volume"],
    });
    const cleanScore = scoreWithHeuristic(clean);
    const flaggedScore = scoreWithHeuristic(flagged);
    expect(flaggedScore.score).toBeLessThan(cleanScore.score);
  });

  it("should never exceed 0-100 range even with extreme values", () => {
    const extremeGood = createMockWalletContext({
      tx_count: 10_000,
      wallet_age_days: 5000,
      unique_counterparties: 500,
      defi_interactions: 100,
      token_diversity: 50,
    });
    const extremeBad = createRiskyWalletContext({
      risk_flags: Array(20).fill("flag"),
    });
    expect(scoreWithHeuristic(extremeGood).score).toBeLessThanOrEqual(100);
    expect(scoreWithHeuristic(extremeBad).score).toBeGreaterThanOrEqual(0);
  });

  it("should include reasoning in the output", () => {
    const input = createMockWalletContext();
    const result = scoreWithHeuristic(input);
    expect(result.reasoning).toBeTruthy();
    expect(typeof result.reasoning).toBe("string");
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});

describe("Wallet Context Input Schema", () => {
  it("should validate a correct input", () => {
    const input = createMockWalletContext();
    const result = WalletContextInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject missing required fields", () => {
    const result = WalletContextInputSchema.safeParse({
      chain: "ethereum",
      // missing other fields
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative tx_count", () => {
    const input = createMockWalletContext({ tx_count: -1 });
    const result = WalletContextInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject largest_tx_ratio > 1", () => {
    const input = createMockWalletContext({ largest_tx_ratio: 1.5 });
    const result = WalletContextInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject empty chain", () => {
    const input = createMockWalletContext({ chain: "" });
    const result = WalletContextInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject empty address", () => {
    const input = createMockWalletContext({ address: "" });
    const result = WalletContextInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("Score Output Schema", () => {
  it("should reject score > 100", () => {
    const result = ScoreOutputSchema.safeParse({
      score: 101,
      confidence: 0.5,
      reasoning: "test",
      positiveFactors: [],
      riskFactors: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject score < 0", () => {
    const result = ScoreOutputSchema.safeParse({
      score: -1,
      confidence: 0.5,
      reasoning: "test",
      positiveFactors: [],
      riskFactors: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject confidence > 1", () => {
    const result = ScoreOutputSchema.safeParse({
      score: 50,
      confidence: 1.5,
      reasoning: "test",
      positiveFactors: [],
      riskFactors: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject confidence < 0", () => {
    const result = ScoreOutputSchema.safeParse({
      score: 50,
      confidence: -0.1,
      reasoning: "test",
      positiveFactors: [],
      riskFactors: [],
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid score output", () => {
    const result = ScoreOutputSchema.safeParse({
      score: 75,
      confidence: 0.85,
      reasoning: "Wallet shows healthy activity patterns",
      positiveFactors: ["Old wallet", "Diverse activity"],
      riskFactors: [],
    });
    expect(result.success).toBe(true);
  });
});
