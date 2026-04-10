import type { GlobalSetupContext } from "vitest/node";
import { Client } from "pg";
import { execa } from "execa";
import { randomUUID } from "crypto";

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://test:test@localhost:5435/test";

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

  // Disponibiliza para os testes via process.env
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
    console.log(`[E2E] Cleaned up schema: ${schema}`);
  };
}
