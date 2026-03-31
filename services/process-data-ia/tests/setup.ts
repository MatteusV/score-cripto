import type { WalletContextInput } from "../src/schemas/score.js";

export function createMockWalletContext(
  overrides: Partial<WalletContextInput> = {}
): WalletContextInput {
  return {
    chain: "ethereum",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
    tx_count: 150,
    total_volume: 45_000,
    unique_counterparties: 35,
    wallet_age_days: 400,
    largest_tx_ratio: 0.15,
    avg_tx_value: 300,
    has_mixer_interaction: false,
    has_sanctioned_interaction: false,
    token_diversity: 12,
    nft_activity: true,
    defi_interactions: 8,
    risk_flags: [],
    ...overrides,
  };
}

export function createRiskyWalletContext(
  overrides: Partial<WalletContextInput> = {}
): WalletContextInput {
  return {
    chain: "ethereum",
    address: "0xBadAddress1234567890abcdef1234567890abcdef",
    tx_count: 2,
    total_volume: 500_000,
    unique_counterparties: 1,
    wallet_age_days: 3,
    largest_tx_ratio: 0.95,
    avg_tx_value: 250_000,
    has_mixer_interaction: true,
    has_sanctioned_interaction: true,
    token_diversity: 1,
    nft_activity: false,
    defi_interactions: 0,
    risk_flags: [
      "tornado_cash_interaction",
      "ofac_sanctioned_counterparty",
      "rapid_fund_movement",
    ],
    ...overrides,
  };
}
