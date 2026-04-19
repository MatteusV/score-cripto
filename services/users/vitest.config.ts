import { generateKeyPairSync } from "node:crypto";
import { defineConfig } from "vitest/config";

// Gera par RSA uma vez por execução de testes (não precisa persistir entre runs)
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["src/tests/e2e/**"],
    env: {
      DATABASE_URL:
        "postgresql://score_cripto:score_cripto@localhost:5435/score_cripto_users",
      JWT_PRIVATE_KEY: privateKey,
      JWT_PUBLIC_KEY: publicKey,
      TEST_JWT_PRIVATE_KEY: privateKey,
      JWT_EXPIRES_IN: "15m",
      REFRESH_TOKEN_EXPIRES_IN: "7d",
      RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
      PORT: "3003",
    },
  },
});
