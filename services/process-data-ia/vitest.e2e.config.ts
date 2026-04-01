import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/e2e/**/*.e2e.spec.ts"],
    globalSetup: ["src/tests/e2e/setup/global-setup.ts"],
    setupFiles: ["src/tests/e2e/setup/setup-env.ts"],
    pool: "forks", // processo separado por suite — garante env isolado
    poolOptions: {
      forks: {
        singleFork: true, // testes E2E rodam em sequência, sem paralelismo
      },
    },
    testTimeout: 30_000, // banco real pode ser mais lento
  },
});
