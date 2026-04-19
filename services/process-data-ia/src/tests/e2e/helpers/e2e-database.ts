import { Client, type QueryResult } from "pg";

/**
 * Helper para gerenciar banco de dados E2E:
 * - Abstrai nomes de tabela (from Prisma @@map)
 * - Gerencia conexão com schema isolado
 * - Cleanup atômico via TRUNCATE CASCADE
 * - Extração de schema via process.env
 */
export class E2EDatabase {
  private readonly client: Client;
  private readonly schema: string;
  private readonly tables: Record<string, string> = {
    processedData: "processed_data",
  };

  constructor(schema: string, baseUrl: string) {
    this.schema = schema;
    this.client = new Client({ connectionString: baseUrl });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    // Seta search_path para evitar problema com pg não entendendo ?schema=
    await this.client.query(`SET search_path TO "${this.schema}"`);
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  /**
   * Limpa todas as tabelas atomicamente via TRUNCATE CASCADE
   * Evita problemas de FK e ordem de deleção
   */
  async cleanup(): Promise<void> {
    const tables = Object.values(this.tables);
    await this.client.query(
      `TRUNCATE TABLE ${tables.map((t) => `"${this.schema}"."${t}"`).join(", ")} CASCADE`
    );
  }

  /**
   * Executa query SQL customizada
   * Retorna resultado bruto do pg
   */
  async query(sql: string): Promise<QueryResult<Record<string, unknown>>> {
    return this.client.query(sql);
  }

  /**
   * Query com schema automático
   * Exemplo: queryTable('processedData', 'SELECT *')
   */
  async queryTable(
    tableName: keyof typeof this.tables,
    sql: string
  ): Promise<QueryResult<Record<string, unknown>>> {
    const table = this.tables[tableName];
    const fullSql = sql.replace(/\?/g, `"${this.schema}"."${table}"`);
    return this.client.query(fullSql);
  }

  /**
   * Obter schema name (para casos onde precisa passar o schema explicitamente)
   */
  getSchema(): string {
    return this.schema;
  }

  /**
   * Obter table name by key (para casos onde precisa da string do nome)
   */
  getTableName(key: keyof typeof this.tables): string {
    return this.tables[key];
  }
}

/**
 * Factory para criar E2EDatabase a partir das variáveis de ambiente
 * Levantará erro se globalSetup não tiver rodado
 */
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

  // Remove ?schema= para pg nativo entender
  const baseUrl = url.split("?")[0];
  return new E2EDatabase(schema, baseUrl);
}
