import { metrics } from "@opentelemetry/api";
import { MODEL_PRICES } from "../ai-pricing.js";

const meter = metrics.getMeter("process-data-ia", "1.0.0");

const aiTokensCounter = meter.createCounter("ai.tokens", {
  description:
    "Tokens consumidos em chamadas de IA. Labels: model, type (prompt|completion)",
});

const aiCostUsdCounter = meter.createCounter("ai.cost_usd", {
  description: "Custo acumulado em USD de chamadas de IA. Labels: model",
});

// Preços em USD por 1 token (não por 1M) — ver src/ai-pricing.ts para atualizar

export function recordAiUsage(
  model: string,
  inputTokens: number,
  outputTokens: number
): void {
  aiTokensCounter.add(inputTokens, { model, type: "prompt" });
  aiTokensCounter.add(outputTokens, { model, type: "completion" });

  const price = MODEL_PRICES[model];
  if (!price) {
    return;
  }

  const cost = inputTokens * price.input + outputTokens * price.output;
  aiCostUsdCounter.add(cost, { model });
}
