// Configura DATABASE_URL e JWT keys antes de qualquer import do Prisma/config
// O globalSetup já definiu E2E_SCHEMA e E2E_DATABASE_URL
import { generateKeyPairSync } from "node:crypto";

const e2eUrl = process.env.E2E_DATABASE_URL;
if (!e2eUrl) {
  throw new Error(
    "[E2E] E2E_DATABASE_URL não definido. Certifique-se que globalSetup rodou."
  );
}

process.env.DATABASE_URL = e2eUrl;

// JWT_PRIVATE_KEY e JWT_PUBLIC_KEY precisam estar definidos para o config.ts
if (!(process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY)) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.JWT_PUBLIC_KEY = publicKey;
}
