import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { EmbeddingProviderType } from '../embedding/index.js';
import { Memory, MemoryStats, MemoryWithEmbedding } from '../memory/index.js';
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
 * Database service for managing memory storage with PGlite and pgvector
 * Handles storage, retrieval, and search operations for memories with vector embeddings
 */
export class DatabaseService {
  private db: PGlite;

  /**
   * Creates a new database service instance
   * @param dataDir - Directory path for PGlite database files (optional, defaults to in-memory)
   */
  constructor(dataDir?: string) {
    this.db = new PGlite(dataDir || 'memory://memory_mcp', {
      extensions: {
        vector,
      },
    });
  }

  /**
   * Initialize the database with schema and test connection
   * @throws Error if unable to connect to the database or initialize schema
   */
  async testConnection(): Promise<void> {
    await this.db.query('SELECT 1');
  }

  /**
   * Initialize the database schema with tables, indexes, and functions
   * @throws Error if schema initialization fails
   */
  async initializeSchema(): Promise<void> {
    await this.db.exec(INITIALIZATION_SQL);
  }

  /**
   * Store a new memory with its embedding in the database
   * @param input - The memory content and metadata to store
   * @param embedding - The vector embedding for the memory content
   * @param embeddingModel - The name of the model used to generate the embedding
   * @param embeddingProvider - The provider type (OpenAI or Ollama)
   * @returns Promise resolving to the stored memory with embedding information
   * @throws Error if the database operation fails
   */
  async storeMemory(
    input: CreateMemoryInput,
    embedding: number[],
    embeddingModel: string,
    embeddingProvider: EmbeddingProviderType,
  ): Promise<MemoryWithEmbedding> {
    try {
      await this.db.query('BEGIN');

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

      const memoryResult = await this.db.query<MemoryRow>(
        memoryQuery,
        memoryValues,
      );
      const memoryRow = memoryResult.rows[0];

      const embeddingTableName = `memory_embeddings_${embeddingProvider}`;
      const embeddingQuery = `
        INSERT INTO ${embeddingTableName} (memory_id, embedding, model)
        VALUES ($1, $2, $3)
      `;

      await this.db.query(embeddingQuery, [
        memoryRow.id,
        `[${embedding.join(',')}]`,
        embeddingModel,
      ]);

      await this.db.query('COMMIT');

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
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Search for memories using vector similarity
   * @param input - Search parameters including query, filters, and thresholds
   * @param queryEmbedding - The vector embedding of the search query
   * @param embeddingProvider - The default provider to search in if not specified in input
   * @returns Promise resolving to an array of search results with similarity scores
   * @throws Error if the database query fails
   */
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

    const result = await this.db.query<SearchResultRow>(query, values);

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
  }

  /**
   * List memories with optional filtering and pagination
   * @param input - Optional filters and pagination parameters
   * @returns Promise resolving to an array of memories (without embedding data)
   * @throws Error if the database query fails
   */
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

    const result = await this.db.query<MemoryRow>(query, values);

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      context: row.context,
      tags: row.tags,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      importanceScore: row.importance_score,
    }));
  }

  /**
   * Get a memory by its unique ID
   * @param id - The unique identifier of the memory
   * @returns Promise resolving to the memory if found, null otherwise
   * @throws Error if the database query fails
   */
  async getMemoryById(id: number): Promise<Memory | null> {
    const query = `
      SELECT ${MEMORY_COLUMNS}
      FROM memories
      WHERE id = $1
    `;

    const result = await this.db.query<MemoryRow>(query, [id]);

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
  }

  /**
   * Get a memory with its embedding data by ID and provider
   * @param id - The unique identifier of the memory
   * @param embeddingProvider - The embedding provider to retrieve embedding data from
   * @returns Promise resolving to the memory with embedding if found, null otherwise
   * @throws Error if the database query fails
   */
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

    const result = await this.db.query<MemoryWithEmbeddingRow>(query, [id]);

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
  }

  /**
   * Delete a memory by its ID (cascades to embedding tables)
   * @param id - The unique identifier of the memory to delete
   * @returns Promise resolving to true if the memory was deleted, false if not found
   * @throws Error if the database operation fails
   */
  async deleteMemory(id: number): Promise<boolean> {
    const query = 'DELETE FROM memories WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.affectedRows !== undefined && result.affectedRows > 0;
  }

  /**
   * Get all unique tags used in memories
   * @returns Promise resolving to an array of unique tag names
   * @throws Error if the database query fails
   */
  async listTags(): Promise<string[]> {
    const query = `
      SELECT DISTINCT unnest(tags) as tag
      FROM memories
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY tag
    `;

    const result = await this.db.query<TagRow>(query);
    return result.rows.map((row) => row.tag);
  }

  /**
   * Get comprehensive statistics about stored memories
   * @returns Promise resolving to statistics including memory counts, importance averages, and embedding counts by provider
   * @throws Error if the database queries fail
   */
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

    const [statsResult, tagsResult, openaiResult, ollamaResult] =
      await Promise.all([
        this.db.query<StatsRow>(statsQuery),
        this.db.query<TagRow>(tagsQuery),
        this.db.query<CountRow>(openaiCountQuery),
        this.db.query<CountRow>(ollamaCountQuery),
      ]);

    return {
      totalMemories: parseInt(statsResult.rows[0].total_memories),
      avgImportance: parseFloat(statsResult.rows[0].avg_importance) || 0,
      uniqueTags: tagsResult.rows.map((row) => row.tag),
      openaiEmbeddings: parseInt(openaiResult.rows[0].count),
      ollamaEmbeddings: parseInt(ollamaResult.rows[0].count),
    };
  }

  /**
   * Close the database connection pool
   * Should be called when shutting down the application
   * @throws Error if closing the pool fails
   */
  async close(): Promise<void> {
    await this.db.close();
  }
}
