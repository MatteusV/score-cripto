import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { Client } from "pg";
import type { GlobalSetupContext } from "vitest/node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://score_cripto:score_cripto@localhost:5435/score_cripto_users";

const E2E_CONFIG_FILE = path.join(__dirname, ".e2e-config.json");

export async function setup({ provide }: GlobalSetupContext) {
  const client = new Client({
    connectionString: E2E_DATABASE_URL.split("?")[0],
  });

  await client.connect();

  const schema = `e2e_${randomUUID().replace(/-/g, "")}`;

  // Cria schema isolado para os testes E2E
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.end();

  const databaseUrlWithSchema = `${E2E_DATABASE_URL.split("?")[0]}?schema=${schema}`;

  // Roda migrações Prisma no schema E2E
  await execa(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrlWithSchema,
      },
      stdio: "inherit",
    }
  );

  // Disponibiliza para os testes via arquivo (processo separado)
  const config = {
    E2E_SCHEMA: schema,
    E2E_DATABASE_URL: databaseUrlWithSchema,
  };
  fs.writeFileSync(E2E_CONFIG_FILE, JSON.stringify(config, null, 2));

  provide("E2E_SCHEMA", schema);
  provide("E2E_DATABASE_URL", databaseUrlWithSchema);

  // Retorna função de cleanup
  return async () => {
    const cleanupClient = new Client({
      connectionString: E2E_DATABASE_URL.split("?")[0],
    });
    await cleanupClient.connect();
    await cleanupClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await cleanupClient.end();
    // Remove o arquivo de configuração
    if (fs.existsSync(E2E_CONFIG_FILE)) {
      fs.unlinkSync(E2E_CONFIG_FILE);
    }
    console.log(`[E2E] Cleaned up schema: ${schema}`);
  };
}
