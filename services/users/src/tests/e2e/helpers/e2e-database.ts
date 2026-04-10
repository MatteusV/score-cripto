import { Client, type QueryResult } from "pg";

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
  const schema = process.env.E2E_SCHEMA;
  if (!schema) {
    throw new Error(
      "[E2E] E2E_SCHEMA não definido. Certifique-se que globalSetup rodou."
    );
  }

  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error(
      "[E2E] E2E_DATABASE_URL não definido. Certifique-se que globalSetup rodou."
    );
  }

  const baseUrl = url.split("?")[0];
  return new E2EDatabase(schema, baseUrl);
}
