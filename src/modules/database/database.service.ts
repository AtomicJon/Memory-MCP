import { EmbeddingProviderType } from '../embedding/index.js';
import { Memory, MemoryStats, MemoryWithEmbedding } from '../memory/index.js';
import { DatabaseInterface } from './database.interface.js';
import { PGliteService } from './pglite.service.js';
import { PostgreSQLService } from './postgresql.service.js';
import {
  CreateMemoryInput,
  DatabaseConfig,
  DatabaseType,
  ListMemoriesInput,
  SearchMemoryInput,
  SearchResult,
} from './database.types.js';

/**
 * Database service factory for managing memory storage with PGlite or PostgreSQL
 * Handles storage, retrieval, and search operations for memories with vector embeddings
 */
export class DatabaseService implements DatabaseInterface {
  private dbImpl: DatabaseInterface;

  /**
   * Creates a new database service instance
   * @param config - Database configuration (PGlite or PostgreSQL)
   */
  constructor(config: DatabaseConfig) {
    if (config.type === DatabaseType.PGLITE) {
      this.dbImpl = new PGliteService(config.dataDir);
    } else if (config.type === DatabaseType.POSTGRESQL) {
      this.dbImpl = new PostgreSQLService(config.connectionString);
    } else {
      throw new Error(
        `Unsupported database type: ${(config as { type: string }).type}`,
      );
    }
  }

  async testConnection(): Promise<void> {
    return this.dbImpl.testConnection();
  }

  async initializeSchema(): Promise<void> {
    return this.dbImpl.initializeSchema();
  }

  async storeMemory(
    input: CreateMemoryInput,
    embedding: number[],
    embeddingModel: string,
    embeddingProvider: EmbeddingProviderType,
  ): Promise<MemoryWithEmbedding> {
    return this.dbImpl.storeMemory(
      input,
      embedding,
      embeddingModel,
      embeddingProvider,
    );
  }

  async searchMemories(
    input: SearchMemoryInput,
    queryEmbedding: number[],
    embeddingProvider: EmbeddingProviderType,
  ): Promise<SearchResult[]> {
    return this.dbImpl.searchMemories(input, queryEmbedding, embeddingProvider);
  }

  async listMemories(input: ListMemoriesInput = {}): Promise<Memory[]> {
    return this.dbImpl.listMemories(input);
  }

  async getMemoryById(id: number): Promise<Memory | null> {
    return this.dbImpl.getMemoryById(id);
  }

  async getMemoryWithEmbeddingById(
    id: number,
    embeddingProvider: EmbeddingProviderType,
  ): Promise<MemoryWithEmbedding | null> {
    return this.dbImpl.getMemoryWithEmbeddingById(id, embeddingProvider);
  }

  async deleteMemory(id: number): Promise<boolean> {
    return this.dbImpl.deleteMemory(id);
  }

  async listTags(): Promise<string[]> {
    return this.dbImpl.listTags();
  }

  async getStats(): Promise<MemoryStats> {
    return this.dbImpl.getStats();
  }

  async close(): Promise<void> {
    return this.dbImpl.close();
  }
}
