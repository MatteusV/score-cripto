import { generateKeyPairSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface RsaKeyPair {
  privateKey: string;
  publicKey: string;
}

export function generateRsaKeyPair(): RsaKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKey, publicKey };
}

// CLI entry point — executado via `pnpm keys:generate`
if (process.argv[1]?.includes("generate-keys")) {
  const force = process.argv.includes("--force");
  const outDir = resolve(process.cwd(), "keys");
  const privateKeyPath = resolve(outDir, "private.pem");
  const publicKeyPath = resolve(outDir, "public.pem");

  if (!existsSync(outDir)) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(outDir, { recursive: true });
  }

  if (!force && existsSync(privateKeyPath)) {
    console.error("⚠️  keys/private.pem já existe. Use --force para sobrescrever.");
    process.exit(1);
  }

  const { privateKey, publicKey } = generateRsaKeyPair();

  writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
  writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

  console.log("✅ Par RSA 2048-bit gerado com sucesso.\n");
  console.log("Adicione ao .env de cada serviço:\n");
  console.log("─── services/users/.env ────────────────────────────");
  console.log(`JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, "\\n")}"`);
  console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, "\\n")}"\n`);
  console.log("─── services/api-gateway/.env ──────────────────────");
  console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, "\\n")}"\n`);
  console.log("📁 Arquivos PEM também salvos em keys/ (não commitar!)");
}
