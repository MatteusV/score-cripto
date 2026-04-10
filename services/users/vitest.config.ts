import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5435/test",
      JWT_SECRET: "test-secret-for-vitest",
      JWT_EXPIRES_IN: "15m",
      REFRESH_TOKEN_EXPIRES_IN: "7d",
      RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
      PORT: "3003",
    },
  },
});
