import { z } from "zod";

export const WalletContextInputSchema = z.object({
  chain: z.string().min(1).max(32),
  address: z.string().min(1).max(128),
  tx_count: z.number().int().min(0),
  total_volume: z.number().min(0),
  unique_counterparties: z.number().int().min(0),
  wallet_age_days: z.number().int().min(0),
  largest_tx_ratio: z.number().min(0).max(1),
  avg_tx_value: z.number().min(0),
  has_mixer_interaction: z.boolean(),
  has_sanctioned_interaction: z.boolean(),
  token_diversity: z.number().int().min(0),
  nft_activity: z.boolean(),
  defi_interactions: z.number().int().min(0),
  risk_flags: z.array(z.string().max(64)).max(10),
});

export type WalletContextInput = z.infer<typeof WalletContextInputSchema>;

export const ScoreOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  positiveFactors: z.array(z.string()),
  riskFactors: z.array(z.string()),
});

export type ScoreOutput = z.infer<typeof ScoreOutputSchema>;

export const ScoreResponseSchema = z.object({
  processId: z.string(),
  chain: z.string(),
  address: z.string(),
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  positiveFactors: z.array(z.string()),
  riskFactors: z.array(z.string()),
  modelVersion: z.string(),
  promptVersion: z.string(),
  cachedResult: z.boolean(),
  validUntil: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type ScoreResponse = z.infer<typeof ScoreResponseSchema>;
