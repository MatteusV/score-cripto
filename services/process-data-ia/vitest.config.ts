import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/use-cases/**/*.spec.ts", "src/orchestrators/**/*.spec.ts"],
    exclude: ["src/tests/e2e/**"],
  },
});
