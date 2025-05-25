import { Pool } from 'pg';
import {
  CreateMemoryInput,
  ListMemoriesInput,
  Memory,
  MemoryWithEmbedding,
  SearchMemoryInput,
  SearchResult,
} from './database.types.js';
import { EmbeddingProviderType } from '../embedding/embedding.types.js';

/**
 * Database service for managing memory storage with PostgreSQL and pgvector
 * Handles storage, retrieval, and search operations for memories with vector embeddings
 */
export class DatabaseService {
  private pool: Pool;

  /**
   * Creates a new database service instance
   * @param connectionString - PostgreSQL connection string for the database
   */
  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Test the database connection
   * @throws Error if unable to connect to the database
   */
  async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
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
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const memoryQuery = `
        INSERT INTO memories (content, context, tags, importance_score)
        VALUES ($1, $2, $3, $4)
        RETURNING id, content, context, tags, created_at, updated_at, importance_score
      `;

      const memoryValues = [
        input.content,
        input.context || null,
        input.tags || [],
        input.importance_score || 1,
      ];

      const memoryResult = await client.query(memoryQuery, memoryValues);
      const memory = memoryResult.rows[0];

      const embeddingTableName = `memory_embeddings_${embeddingProvider}`;
      const embeddingQuery = `
        INSERT INTO ${embeddingTableName} (memory_id, embedding, model)
        VALUES ($1, $2, $3)
      `;

      await client.query(embeddingQuery, [
        memory.id,
        JSON.stringify(embedding),
        embeddingModel,
      ]);

      await client.query('COMMIT');

      return {
        id: memory.id,
        content: memory.content,
        context: memory.context,
        tags: memory.tags,
        created_at: memory.created_at,
        updated_at: memory.updated_at,
        importance_score: memory.importance_score,
        embedding,
        embedding_model: embeddingModel,
        embedding_provider: embeddingProvider,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
    const client = await this.pool.connect();
    try {
      const searchProvider = input.embedding_provider || embeddingProvider;
      const embeddingTableName = `memory_embeddings_${searchProvider}`;

      let query = `
        SELECT 
          m.id, m.content, m.context, m.tags, m.created_at, m.updated_at, m.importance_score,
          e.embedding, e.model,
          1 - (e.embedding <=> $1::vector) as similarity_score
        FROM memories m
        JOIN ${embeddingTableName} e ON m.id = e.memory_id
        WHERE 1 - (e.embedding <=> $1::vector) >= $2
      `;

      const values: unknown[] = [
        JSON.stringify(queryEmbedding),
        input.similarity_threshold || 0.7,
      ];

      let paramIndex = 3;

      if (input.embedding_model) {
        query += ` AND e.model = $${paramIndex}`;
        values.push(input.embedding_model);
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

      const result = await client.query(query, values);

      return result.rows.map((row) => ({
        memory: {
          id: row.id,
          content: row.content,
          context: row.context,
          tags: row.tags,
          created_at: row.created_at,
          updated_at: row.updated_at,
          importance_score: row.importance_score,
          embedding: JSON.parse(row.embedding),
          embedding_model: row.model,
          embedding_provider: searchProvider,
        },
        similarity_score: parseFloat(row.similarity_score),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * List memories with optional filtering and pagination
   * @param input - Optional filters and pagination parameters
   * @returns Promise resolving to an array of memories (without embedding data)
   * @throws Error if the database query fails
   */
  async listMemories(input: ListMemoriesInput = {}): Promise<Memory[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT id, content, context, tags, created_at, updated_at, importance_score
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

      if (input.min_importance) {
        query += ` AND importance_score >= $${paramIndex}`;
        values.push(input.min_importance);
        paramIndex++;
      }

      if (input.start_date) {
        query += ` AND created_at >= $${paramIndex}`;
        values.push(input.start_date);
        paramIndex++;
      }

      if (input.end_date) {
        query += ` AND created_at <= $${paramIndex}`;
        values.push(input.end_date);
        paramIndex++;
      }

      if (input.embedding_provider) {
        const embeddingTableName = `memory_embeddings_${input.embedding_provider}`;
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

      const result = await client.query(query, values);

      return result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        context: row.context,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
        importance_score: row.importance_score,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get a memory by its unique ID
   * @param id - The unique identifier of the memory
   * @returns Promise resolving to the memory if found, null otherwise
   * @throws Error if the database query fails
   */
  async getMemoryById(id: number): Promise<Memory | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, content, context, tags, created_at, updated_at, importance_score
        FROM memories
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        content: row.content,
        context: row.context,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
        importance_score: row.importance_score,
      };
    } finally {
      client.release();
    }
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
    const client = await this.pool.connect();
    try {
      const embeddingTableName = `memory_embeddings_${embeddingProvider}`;
      const query = `
        SELECT 
          m.id, m.content, m.context, m.tags, m.created_at, m.updated_at, m.importance_score,
          e.embedding, e.model
        FROM memories m
        JOIN ${embeddingTableName} e ON m.id = e.memory_id
        WHERE m.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        content: row.content,
        context: row.context,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
        importance_score: row.importance_score,
        embedding: JSON.parse(row.embedding),
        embedding_model: row.model,
        embedding_provider: embeddingProvider,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Delete a memory by its ID (cascades to embedding tables)
   * @param id - The unique identifier of the memory to delete
   * @returns Promise resolving to true if the memory was deleted, false if not found
   * @throws Error if the database operation fails
   */
  async deleteMemory(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM memories WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get all unique tags used in memories
   * @returns Promise resolving to an array of unique tag names
   * @throws Error if the database query fails
   */
  async listTags(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT DISTINCT unnest(tags) as tag
        FROM memories
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
        ORDER BY tag
      `;

      const result = await client.query(query);
      return result.rows.map((row) => row.tag);
    } finally {
      client.release();
    }
  }

  /**
   * Get comprehensive statistics about stored memories
   * @returns Promise resolving to statistics including memory counts, importance averages, and embedding counts by provider
   * @throws Error if the database queries fail
   */
  async getStats(): Promise<{
    total_memories: number;
    avg_importance: number;
    unique_tags: string[];
    openai_embeddings: number;
    ollama_embeddings: number;
  }> {
    const client = await this.pool.connect();
    try {
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
          client.query(statsQuery),
          client.query(tagsQuery),
          client.query(openaiCountQuery),
          client.query(ollamaCountQuery),
        ]);

      return {
        total_memories: parseInt(statsResult.rows[0].total_memories),
        avg_importance: parseFloat(statsResult.rows[0].avg_importance) || 0,
        unique_tags: tagsResult.rows.map((row) => row.tag),
        openai_embeddings: parseInt(openaiResult.rows[0].count),
        ollama_embeddings: parseInt(ollamaResult.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection pool
   * Should be called when shutting down the application
   * @throws Error if closing the pool fails
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
