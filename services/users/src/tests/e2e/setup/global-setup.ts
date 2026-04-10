import { execSync } from "node:child_process";
import { Client } from "pg";

const BASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://score_cripto:score_cripto@localhost:5435/score_cripto_users";

const TEST_SCHEMA = `e2e_${Date.now()}`;
const TEST_DATABASE_URL = `${BASE_URL.split("?")[0]}?schema=${TEST_SCHEMA}`;

export async function setup(): Promise<void> {
  const client = new Client({ connectionString: BASE_URL.split("?")[0] });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${TEST_SCHEMA}"`);
  await client.end();

  execSync("pnpm prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });

  process.env.E2E_SCHEMA = TEST_SCHEMA;
  process.env.E2E_DATABASE_URL = TEST_DATABASE_URL;

  console.log(`[E2E] Schema criado: ${TEST_SCHEMA}`);
}

export async function teardown(): Promise<void> {
  const schema = process.env.E2E_SCHEMA;
  if (!schema) {
    console.warn("[E2E] E2E_SCHEMA não definido no teardown, skip");
    return;
  }

  const client = new Client({ connectionString: BASE_URL.split("?")[0] });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
  console.log(`[E2E] Schema removido: ${schema}`);
}
