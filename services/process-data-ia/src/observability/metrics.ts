import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("process-data-ia", "1.0.0");

const aiTokensCounter = meter.createCounter("ai.tokens", {
  description:
    "Tokens consumidos em chamadas de IA. Labels: model, type (prompt|completion)",
});

const aiCostUsdCounter = meter.createCounter("ai.cost_usd", {
  description: "Custo acumulado em USD de chamadas de IA. Labels: model",
});

// Preços em USD por 1 token (não por 1M)
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "mistral/ministral-3b": { input: 0.000_000_04, output: 0.000_000_04 },
  "gpt-4o-mini": { input: 0.000_000_15, output: 0.000_000_6 },
};

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
