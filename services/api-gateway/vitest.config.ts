import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5434/test",
      RABBITMQ_URL: "amqp://localhost:5672",
      USERS_SERVICE_URL: "http://users:3003",
    },
  },
});
