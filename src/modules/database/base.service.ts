import { EmbeddingProviderType } from '../embedding/index.js';
import { Memory, MemoryStats, MemoryWithEmbedding } from '../memory/index.js';
import { DatabaseInterface } from './database.interface.js';
import {
  INITIALIZATION_SQL,
  MEMORY_COLUMNS,
  MEMORY_WITH_EMBEDDING_COLUMNS,
  SEARCH_RESULT_COLUMNS,
} from './database.queries.js';
import {
  CountRow,
  CreateMemoryInput,
  ListMemoriesInput,
  MemoryRow,
  MemoryWithEmbeddingRow,
  SearchMemoryInput,
  SearchResult,
  SearchResultRow,
  StatsRow,
  TagRow,
} from './database.types.js';

/**
 * Query result interface that both PGlite and PostgreSQL can implement
 */
export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount?: number | null;
  affectedRows?: number;
}

/**
 * Database client interface that both PGlite and PostgreSQL can implement
 */
export interface DatabaseClient {
  query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  exec?(sql: string): Promise<void>;
}

/**
 * Base database service containing shared SQL logic for both PGlite and PostgreSQL
 */
export abstract class BaseDatabaseService implements DatabaseInterface {
  protected abstract getClient(): Promise<DatabaseClient>;
  protected abstract releaseClient?(client: DatabaseClient): void;

  async testConnection(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('SELECT 1');
    } finally {
      this.releaseClient?.(client);
    }
  }

  async initializeSchema(): Promise<void> {
    const client = await this.getClient();
    try {
      if (client.exec) {
        await client.exec(INITIALIZATION_SQL);
      } else {
        // For clients that don't support exec, split and run individual statements
        const statements = INITIALIZATION_SQL.split(';').filter((s) =>
          s.trim(),
        );
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }
      }
    } finally {
      this.releaseClient?.(client);
    }
  }

  async storeMemory(
    input: CreateMemoryInput,
    embedding: number[],
    embeddingModel: string,
    embeddingProvider: EmbeddingProviderType,
  ): Promise<MemoryWithEmbedding> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');

      const memoryQuery = `
        INSERT INTO memories (content, context, tags, importance_score)
        VALUES ($1, $2, $3, $4)
        RETURNING ${MEMORY_COLUMNS}
      `;

      const memoryValues = [
        input.content,
        input.context || null,
        input.tags || [],
        input.importanceScore || 1,
      ];

      const memoryResult = await client.query<MemoryRow>(
        memoryQuery,
        memoryValues,
      );
      const memoryRow = memoryResult.rows[0];

      const embeddingTableName = `memory_embeddings_${embeddingProvider}`;
      const embeddingQuery = `
        INSERT INTO ${embeddingTableName} (memory_id, embedding, model)
        VALUES ($1, $2, $3)
      `;

      await client.query(embeddingQuery, [
        memoryRow.id,
        `[${embedding.join(',')}]`,
        embeddingModel,
      ]);

      await client.query('COMMIT');

      return {
        id: memoryRow.id,
        content: memoryRow.content,
        context: memoryRow.context,
        tags: memoryRow.tags,
        createdAt: new Date(memoryRow.created_at),
        updatedAt: new Date(memoryRow.updated_at),
        importanceScore: memoryRow.importance_score,
        embedding,
        embeddingModel,
        embeddingProvider,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      this.releaseClient?.(client);
    }
  }

  async searchMemories(
    input: SearchMemoryInput,
    queryEmbedding: number[],
    embeddingProvider: EmbeddingProviderType,
  ): Promise<SearchResult[]> {
    const searchProvider = input.embeddingProvider || embeddingProvider;
    const embeddingTableName = `memory_embeddings_${searchProvider}`;

    let query = `
      SELECT ${SEARCH_RESULT_COLUMNS}
      FROM memories m
      JOIN ${embeddingTableName} e ON m.id = e.memory_id
      WHERE 1 - (e.embedding <=> $1::vector) >= $2
    `;

    const values: unknown[] = [
      `[${queryEmbedding.join(',')}]`,
      input.similarityThreshold || 0.7,
    ];

    let paramIndex = 3;

    if (input.embeddingModel) {
      query += ` AND e.model = $${paramIndex}`;
      values.push(input.embeddingModel);
      paramIndex++;
    }

    if (input.tags && input.tags.length > 0) {
      query += ` AND m.tags && $${paramIndex}`;
      values.push(input.tags);
      paramIndex++;
    }

    query += `
      ORDER BY similarity_score DESC, m.importance_score DESC
      LIMIT $${paramIndex}
    `;
    values.push(input.limit || 10);

    const client = await this.getClient();
    try {
      const result = await client.query<SearchResultRow>(query, values);

      return result.rows.map((row) => ({
        memory: {
          id: row.id,
          content: row.content,
          context: row.context,
          tags: row.tags,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          importanceScore: row.importance_score,
          embedding: JSON.parse(row.embedding),
          embeddingModel: row.model,
          embeddingProvider: searchProvider,
        },
        similarityScore: parseFloat(row.similarity_score),
      }));
    } finally {
      this.releaseClient?.(client);
    }
  }

  async listMemories(input: ListMemoriesInput = {}): Promise<Memory[]> {
    let query = `
      SELECT ${MEMORY_COLUMNS}
      FROM memories
      WHERE 1=1
    `;

    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.tags && input.tags.length > 0) {
      query += ` AND tags && $${paramIndex}`;
      values.push(input.tags);
      paramIndex++;
    }

    if (input.minImportance) {
      query += ` AND importance_score >= $${paramIndex}`;
      values.push(input.minImportance);
      paramIndex++;
    }

    if (input.startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      values.push(input.startDate);
      paramIndex++;
    }

    if (input.endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      values.push(input.endDate);
      paramIndex++;
    }

    if (input.embeddingProvider) {
      const embeddingTableName = `memory_embeddings_${input.embeddingProvider}`;
      query += ` AND EXISTS (SELECT 1 FROM ${embeddingTableName} WHERE memory_id = memories.id)`;
    }

    query += ` ORDER BY created_at DESC`;

    if (input.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(input.limit);
      paramIndex++;
    }

    if (input.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(input.offset);
      paramIndex++;
    }

    const client = await this.getClient();
    try {
      const result = await client.query<MemoryRow>(query, values);

      return result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        context: row.context,
        tags: row.tags,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        importanceScore: row.importance_score,
      }));
    } finally {
      this.releaseClient?.(client);
    }
  }

  async getMemoryById(id: number): Promise<Memory | null> {
    const query = `
      SELECT ${MEMORY_COLUMNS}
      FROM memories
      WHERE id = $1
    `;

    const client = await this.getClient();
    try {
      const result = await client.query<MemoryRow>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        content: row.content,
        context: row.context,
        tags: row.tags,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        importanceScore: row.importance_score,
      };
    } finally {
      this.releaseClient?.(client);
    }
  }

  async getMemoryWithEmbeddingById(
    id: number,
    embeddingProvider: EmbeddingProviderType,
  ): Promise<MemoryWithEmbedding | null> {
    const embeddingTableName = `memory_embeddings_${embeddingProvider}`;
    const query = `
      SELECT ${MEMORY_WITH_EMBEDDING_COLUMNS}
      FROM memories m
      JOIN ${embeddingTableName} e ON m.id = e.memory_id
      WHERE m.id = $1
    `;

    const client = await this.getClient();
    try {
      const result = await client.query<MemoryWithEmbeddingRow>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        content: row.content,
        context: row.context,
        tags: row.tags,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        importanceScore: row.importance_score,
        embedding: JSON.parse(row.embedding),
        embeddingModel: row.model,
        embeddingProvider: embeddingProvider,
      };
    } finally {
      this.releaseClient?.(client);
    }
  }

  async deleteMemory(id: number): Promise<boolean> {
    const query = 'DELETE FROM memories WHERE id = $1';
    const client = await this.getClient();
    try {
      const result = await client.query(query, [id]);
      return (
        (result.rowCount !== null &&
          result.rowCount !== undefined &&
          result.rowCount > 0) ||
        (result.affectedRows !== undefined && result.affectedRows > 0)
      );
    } finally {
      this.releaseClient?.(client);
    }
  }

  async listTags(): Promise<string[]> {
    const query = `
      SELECT DISTINCT unnest(tags) as tag
      FROM memories
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag
    `;

    const client = await this.getClient();
    try {
      const result = await client.query<TagRow>(query);
      return result.rows.map((row) => row.tag);
    } finally {
      this.releaseClient?.(client);
    }
  }

  async getStats(): Promise<MemoryStats> {
    const statsQuery = `
      SELECT
        COUNT(*) as total_memories,
        AVG(importance_score) as avg_importance
      FROM memories
    `;

    const tagsQuery = `
      SELECT DISTINCT unnest(tags) as tag
      FROM memories
      ORDER BY tag
    `;

    const openaiCountQuery = `
      SELECT COUNT(*) as count FROM memory_embeddings_openai
    `;

    const ollamaCountQuery = `
      SELECT COUNT(*) as count FROM memory_embeddings_ollama
    `;

    const client = await this.getClient();
    try {
      const [statsResult, tagsResult, openaiResult, ollamaResult] =
        await Promise.all([
          client.query<StatsRow>(statsQuery),
          client.query<TagRow>(tagsQuery),
          client.query<CountRow>(openaiCountQuery),
          client.query<CountRow>(ollamaCountQuery),
        ]);

      return {
        totalMemories: parseInt(statsResult.rows[0].total_memories),
        avgImportance: parseFloat(statsResult.rows[0].avg_importance) || 0,
        uniqueTags: tagsResult.rows.map((row) => row.tag),
        openaiEmbeddings: parseInt(openaiResult.rows[0].count),
        ollamaEmbeddings: parseInt(ollamaResult.rows[0].count),
      };
    } finally {
      this.releaseClient?.(client);
    }
  }

  abstract close(): Promise<void>;
}
