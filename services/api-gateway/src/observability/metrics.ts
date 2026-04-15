import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("api-gateway", "1.0.0");

export const analysisRequestsCounter = meter.createCounter(
  "analysis.requests",
  {
    description:
      "Total de requisições de análise recebidas. Labels: chain, status (created|cached|error)",
  }
);

export const usersCheckFailOpenCounter = meter.createCounter(
  "users_check.fail_open",
  {
    description:
      "Número de vezes que o api-gateway procedeu com fail-open por indisponibilidade do users service. Labels: reason (timeout|circuit_open|server_error|network_error)",
  }
);

export const usersCheckDurationHistogram = meter.createHistogram(
  "users_check.duration_ms",
  {
    description:
      "Latência em ms da chamada ao users service. Labels: outcome (ok|429|timeout|circuit_open|server_error|network_error)",
    unit: "ms",
  }
);
