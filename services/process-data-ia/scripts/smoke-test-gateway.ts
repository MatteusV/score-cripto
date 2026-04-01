/**
 * Smoke test para validar integração com Vercel AI Gateway.
 * Uso: tsx scripts/smoke-test-gateway.ts
 */
import "dotenv/config";

// Valida env antes de importar scoring (config.ts faz throw sem DATABASE_URL)
process.env.DATABASE_URL ??=
  "postgresql://placeholder:placeholder@localhost:5433/placeholder";

import type { WalletContextInput } from "../src/schemas/score.js";
import { scoreWithAI } from "../src/services/scoring.js";

const testWallet: WalletContextInput = {
  chain: "ethereum",
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", // vitalik.eth
  tx_count: 1200,
  total_volume: 50_000,
  unique_counterparties: 300,
  wallet_age_days: 3000,
  largest_tx_ratio: 0.05,
  avg_tx_value: 41.6,
  has_mixer_interaction: false,
  has_sanctioned_interaction: false,
  token_diversity: 25,
  nft_activity: true,
  defi_interactions: 80,
  risk_flags: [],
};

console.log("🔗 Chamando AI Gateway (openai/gpt-5.4-mini)...\n");

const start = Date.now();
const result = await scoreWithAI(testWallet);
const elapsed = Date.now() - start;

console.log(`✅ Resposta recebida em ${elapsed}ms`);
console.log(`   Score:      ${result.output.score}/100`);
console.log(`   Confidence: ${result.output.confidence}`);
console.log(`   Tokens:     ${result.tokensUsed}`);
console.log(`   Cost:       $${result.cost.toFixed(6)}`);
console.log(`   Model:      ${result.modelVersion}`);
console.log(`\n📝 Reasoning: ${result.output.reasoning.slice(0, 120)}...`);
console.log(`\n✅ Positive factors (${result.output.positiveFactors.length}):`);
for (const f of result.output.positiveFactors) {
  console.log(`   + ${f}`);
}
console.log(`\n⚠️  Risk factors (${result.output.riskFactors.length}):`);
for (const f of result.output.riskFactors) {
  console.log(`   - ${f}`);
}
