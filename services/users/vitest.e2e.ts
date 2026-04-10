import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/e2e/**/*.e2e.spec.ts"],
    globalSetup: ["src/tests/e2e/setup/global-setup.ts"],
    setupFiles: ["src/tests/e2e/setup/setup-env.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
  },
});
