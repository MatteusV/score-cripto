import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("api-gateway", "1.0.0");

export const analysisRequestsCounter = meter.createCounter("analysis.requests", {
  description:
    "Total de requisições de análise recebidas. Labels: chain, status (created|cached|error)",
});
