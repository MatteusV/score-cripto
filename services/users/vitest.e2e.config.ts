import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/e2e/**/*.spec.ts"],
    globalSetup: ["./src/tests/e2e/helpers/globalSetup.ts"],
    env: {
      E2E_DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        "postgresql://score_cripto:score_cripto@localhost:5435/score_cripto_users",
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        "postgresql://score_cripto:score_cripto@localhost:5435/score_cripto_users",
      JWT_SECRET: "test-secret-for-vitest",
      JWT_EXPIRES_IN: "15m",
      REFRESH_TOKEN_EXPIRES_IN: "7d",
      RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
      PORT: "3003",
    },
  },
});
