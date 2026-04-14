import { generateKeyPairSync } from "node:crypto";
import { defineConfig } from "vitest/config";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5434/test",
      RABBITMQ_URL: "amqp://localhost:5672",
      USERS_SERVICE_URL: "http://users:3003",
      JWT_PUBLIC_KEY: publicKey,
      // Disponível para os testes que precisam assinar tokens
      TEST_JWT_PRIVATE_KEY: privateKey,
      // Limites baixos para tornar os testes de rate-limit rápidos
      RATE_LIMIT_MAX_AUTH: "5",
      RATE_LIMIT_MAX_ANON: "3",
      RATE_LIMIT_WINDOW_MS: "60000",
    },
  },
});
