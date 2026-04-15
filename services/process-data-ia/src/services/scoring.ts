import { gateway, generateText, Output } from "ai";
import { recordAiUsage } from "../observability/metrics.js";
import { z } from "zod";
import type { ScoreOutput, WalletContextInput } from "../schemas/score.js";

const PROMPT_VERSION = "v1.0";
const MODEL_SLUG = "mistral/ministral-3b";

const AI_SCORE_SCHEMA = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Trust score from 0 (high risk) to 100 (highly trustworthy)"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence level of the assessment from 0 to 1"),
  reasoning: z
    .string()
    .describe("Detailed explanation of the score assessment"),
  positiveFactors: z
    .array(z.string())
    .describe("List of positive trust indicators found"),
  riskFactors: z.array(z.string()).describe("List of risk indicators found"),
});

function buildPrompt(input: WalletContextInput): string {
  return `You are an expert blockchain wallet risk analyst. Evaluate the following wallet data and produce a trust score.

WALLET DATA:
- Chain: ${input.chain}
- Address: ${input.address}
- Transaction count: ${input.tx_count}
- Total volume: ${input.total_volume}
- Unique counterparties: ${input.unique_counterparties}
- Wallet age (days): ${input.wallet_age_days}
- Largest transaction ratio: ${input.largest_tx_ratio}
- Average transaction value: ${input.avg_tx_value}
- Mixer interaction: ${input.has_mixer_interaction}
- Sanctioned address interaction: ${input.has_sanctioned_interaction}
- Token diversity: ${input.token_diversity}
- NFT activity: ${input.nft_activity}
- DeFi interactions: ${input.defi_interactions}
- Risk flags: ${input.risk_flags.length > 0 ? input.risk_flags.join(", ") : "None"}

SCORING RULES:
- Score 0-100 where 0 is extremely risky and 100 is highly trustworthy
- Mixer interactions and sanctioned address interactions are severe red flags
- Low transaction count with high volume suggests unusual activity
- Older wallets with diverse activity patterns are generally more trustworthy
- High largest_tx_ratio (close to 1.0) means one transaction dominates total volume, which is suspicious
- DeFi interactions and token diversity indicate organic usage
- Only base your assessment on the provided data, do not hallucinate additional information
- Be conservative: when in doubt, lower the score`;
}

export interface ScoringResult {
  cost: number;
  durationMs: number;
  modelVersion: string;
  output: ScoreOutput;
  promptVersion: string;
  tokensUsed: number;
}

export async function scoreWithAI(
  input: WalletContextInput
): Promise<ScoringResult> {
  const start = Date.now();

  const result = await generateText({
    model: gateway(MODEL_SLUG),
    output: Output.object({ schema: AI_SCORE_SCHEMA }),
    prompt: buildPrompt(input),
    providerOptions: {
      gateway: {
        tags: ["feature:wallet-scoring", "service:process-data-ia"],
      },
    },
  });

  const durationMs = Date.now() - start;

  const tokensUsed = result.usage?.totalTokens ?? 0;
  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;
  // gpt-5.4-mini pricing: cost tracked automatically in Vercel AI Gateway dashboard
  const cost = inputTokens * 0.000_000_15 + outputTokens * 0.000_000_6;

  recordAiUsage(MODEL_SLUG, inputTokens, outputTokens);

  return {
    output: result.output,
    modelVersion: MODEL_SLUG,
    promptVersion: PROMPT_VERSION,
    tokensUsed,
    cost,
    durationMs,
  };
}

export function scoreWithHeuristic(input: WalletContextInput): ScoreOutput {
  let score = 50;
  const positiveFactors: string[] = [];
  const riskFactors: string[] = [];

  // Wallet age
  if (input.wallet_age_days > 365) {
    score += 10;
    positiveFactors.push("Wallet is older than 1 year");
  } else if (input.wallet_age_days > 90) {
    score += 5;
    positiveFactors.push("Wallet is older than 90 days");
  } else if (input.wallet_age_days < 7) {
    score -= 15;
    riskFactors.push("Wallet is less than 7 days old");
  }

  // Transaction count
  if (input.tx_count > 100) {
    score += 10;
    positiveFactors.push("High transaction count (>100)");
  } else if (input.tx_count > 20) {
    score += 5;
    positiveFactors.push("Moderate transaction count (>20)");
  } else if (input.tx_count < 3) {
    score -= 10;
    riskFactors.push("Very few transactions (<3)");
  }

  // Unique counterparties
  if (input.unique_counterparties > 20) {
    score += 8;
    positiveFactors.push("Diverse counterparty network (>20 unique)");
  } else if (input.unique_counterparties < 3) {
    score -= 8;
    riskFactors.push("Very few unique counterparties (<3)");
  }

  // Mixer interaction
  if (input.has_mixer_interaction) {
    score -= 25;
    riskFactors.push("Interaction with known mixer services");
  }

  // Sanctioned interaction
  if (input.has_sanctioned_interaction) {
    score -= 30;
    riskFactors.push("Interaction with sanctioned addresses");
  }

  // Largest tx ratio
  if (input.largest_tx_ratio > 0.8) {
    score -= 10;
    riskFactors.push("Single transaction dominates total volume (>80%)");
  } else if (input.largest_tx_ratio < 0.3) {
    score += 5;
    positiveFactors.push("Well-distributed transaction volumes");
  }

  // DeFi interactions
  if (input.defi_interactions > 5) {
    score += 8;
    positiveFactors.push("Active DeFi usage");
  }

  // Token diversity
  if (input.token_diversity > 5) {
    score += 5;
    positiveFactors.push("Diverse token portfolio");
  }

  // NFT activity
  if (input.nft_activity) {
    score += 3;
    positiveFactors.push("NFT activity present");
  }

  // Risk flags
  if (input.risk_flags.length > 0) {
    score -= input.risk_flags.length * 5;
    riskFactors.push(
      `${input.risk_flags.length} risk flag(s) detected: ${input.risk_flags.join(", ")}`
    );
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Calculate confidence based on data richness
  const dataPoints = [
    input.tx_count > 0,
    input.wallet_age_days > 0,
    input.unique_counterparties > 0,
    input.total_volume > 0,
    input.defi_interactions > 0,
    input.token_diversity > 0,
  ].filter(Boolean).length;
  const confidence = Math.round((dataPoints / 6) * 0.8 * 100) / 100; // max 0.8 for heuristic

  const reasoning =
    `Heuristic score based on ${dataPoints}/6 available data signals. ` +
    `${positiveFactors.length} positive factor(s) and ${riskFactors.length} risk factor(s) identified.`;

  return {
    score,
    confidence,
    reasoning,
    positiveFactors,
    riskFactors,
  };
}
