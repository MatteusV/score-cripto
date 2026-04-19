import { describe, expect, it } from "vitest";
import { WalletContextInputSchema } from "./score.js";

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
    risk_flags: [],
    ...overrides,
  };
}

describe("WalletContextInputSchema — injection hardening limits", () => {
  it("rejects chain longer than 32 chars", () => {
    const res = WalletContextInputSchema.safeParse(
      baseInput({ chain: "a".repeat(33) })
    );
    expect(res.success).toBe(false);
  });

  it("rejects address longer than 128 chars", () => {
    const res = WalletContextInputSchema.safeParse(
      baseInput({ address: "x".repeat(129) })
    );
    expect(res.success).toBe(false);
  });

  it("rejects risk_flags arrays with more than 10 entries", () => {
    const res = WalletContextInputSchema.safeParse(
      baseInput({ risk_flags: Array.from({ length: 11 }, () => "flag") })
    );
    expect(res.success).toBe(false);
  });

  it("rejects individual risk_flag longer than 64 chars", () => {
    const res = WalletContextInputSchema.safeParse(
      baseInput({ risk_flags: ["a".repeat(65)] })
    );
    expect(res.success).toBe(false);
  });

  it("accepts well-formed input at the limits", () => {
    const res = WalletContextInputSchema.safeParse(
      baseInput({
        chain: "a".repeat(32),
        address: "x".repeat(128),
        risk_flags: Array.from({ length: 10 }, () => "a".repeat(64)),
      })
    );
    expect(res.success).toBe(true);
  });
});
