import { Client, type QueryResult } from "pg";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const E2E_CONFIG_FILE = path.join(__dirname, ".e2e-config.json");

export class E2EDatabase {
  private readonly client: Client;
  private readonly schema: string;
  private readonly tables: Record<string, string> = {
    users: "users",
    refreshTokens: "refresh_tokens",
    subscriptions: "subscriptions",
    usageRecords: "usage_records",
  };

  constructor(schema: string, baseUrl: string) {
    this.schema = schema;
    this.client = new Client({ connectionString: baseUrl });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.client.query(`SET search_path TO "${this.schema}"`);
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async cleanup(): Promise<void> {
    // Limpa na ordem correta para respeitar FKs
    await this.client.query(
      `TRUNCATE TABLE "${this.schema}"."usage_records", "${this.schema}"."subscriptions", "${this.schema}"."refresh_tokens", "${this.schema}"."users" CASCADE`
    );
  }

  async query(sql: string): Promise<QueryResult<Record<string, unknown>>> {
    return this.client.query(sql);
  }

  getSchema(): string {
    return this.schema;
  }

  getTableName(key: keyof typeof this.tables): string {
    return this.tables[key];
  }
}

export function createE2EDatabase(): E2EDatabase {
  // Tenta ler do arquivo de configuração primeiro (globalSetup)
  let schema: string | undefined;
  let e2eDatabaseUrl: string | undefined;

  if (fs.existsSync(E2E_CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(E2E_CONFIG_FILE, "utf-8"));
    schema = config.E2E_SCHEMA;
    e2eDatabaseUrl = config.E2E_DATABASE_URL;
  }

  // Fallback para process.env
  schema = schema ?? process.env.E2E_SCHEMA;
  e2eDatabaseUrl = e2eDatabaseUrl ?? process.env.E2E_DATABASE_URL;

  if (!schema) {
    throw new Error(
      "[E2E] E2E_SCHEMA não definido. Certifique-se que globalSetup rodou."
    );
  }

  if (!e2eDatabaseUrl) {
    throw new Error(
      "[E2E] E2E_DATABASE_URL não definido. Certifique-se que globalSetup rodou."
    );
  }

  const baseUrl = e2eDatabaseUrl.split("?")[0];
  return new E2EDatabase(schema, baseUrl);
}
