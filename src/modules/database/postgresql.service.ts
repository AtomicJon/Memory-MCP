import { Pool, PoolClient } from 'pg';
import { BaseDatabaseService, DatabaseClient } from './base.service.js';

/**
 * PostgreSQL client adapter to match DatabaseClient interface
 */
class PostgreSQLClientAdapter implements DatabaseClient {
  constructor(public readonly client: PoolClient) {}

  async query<T = unknown>(text: string, params?: unknown[]) {
    const result = await this.client.query(text, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  }
}

/**
 * PostgreSQL database implementation for memory storage
 */
export class PostgreSQLService extends BaseDatabaseService {
  private pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  protected async getClient(): Promise<DatabaseClient> {
    const client = await this.pool.connect();
    return new PostgreSQLClientAdapter(client);
  }

  protected releaseClient(client: DatabaseClient): void {
    // Get the original PoolClient from the adapter
    const adapter = client as PostgreSQLClientAdapter;
    adapter.client.release();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
