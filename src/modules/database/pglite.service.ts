import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { BaseDatabaseService, DatabaseClient } from './base.service.js';

/**
 * PGlite client adapter to match DatabaseClient interface
 */
class PGliteClientAdapter implements DatabaseClient {
  constructor(private db: PGlite) {}

  async query<T = unknown>(text: string, params?: unknown[]) {
    const result = await this.db.query(text, params);
    return {
      rows: result.rows as T[],
      affectedRows: result.affectedRows,
    };
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql);
  }
}

/**
 * PGlite database implementation for memory storage
 */
export class PGliteService extends BaseDatabaseService {
  private db: PGlite;

  constructor(dataDir?: string) {
    super();
    this.db = new PGlite(dataDir || 'memory://memory_mcp', {
      extensions: {
        vector,
      },
    });
  }

  protected async getClient(): Promise<DatabaseClient> {
    return new PGliteClientAdapter(this.db);
  }

  protected releaseClient(_client: DatabaseClient): void {
    // PGlite doesn't need connection management like PostgreSQL
    // This is a no-op for PGlite
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
