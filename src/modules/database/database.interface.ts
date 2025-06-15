import { EmbeddingProviderType } from '../embedding/index.js';
import { Memory, MemoryStats, MemoryWithEmbedding } from '../memory/index.js';
import {
  CreateMemoryInput,
  ListMemoriesInput,
  SearchMemoryInput,
  SearchResult,
} from './database.types.js';

/**
 * Database interface that can be implemented by different database backends
 */
export interface DatabaseInterface {
  /**
   * Test the database connection
   */
  testConnection(): Promise<void>;

  /**
   * Initialize the database schema
   */
  initializeSchema(): Promise<void>;

  /**
   * Store a new memory with its embedding
   */
  storeMemory(
    input: CreateMemoryInput,
    embedding: number[],
    embeddingModel: string,
    embeddingProvider: EmbeddingProviderType,
  ): Promise<MemoryWithEmbedding>;

  /**
   * Search for memories using vector similarity
   */
  searchMemories(
    input: SearchMemoryInput,
    queryEmbedding: number[],
    embeddingProvider: EmbeddingProviderType,
  ): Promise<SearchResult[]>;

  /**
   * List memories with optional filtering and pagination
   */
  listMemories(input?: ListMemoriesInput): Promise<Memory[]>;

  /**
   * Get a memory by its unique ID
   */
  getMemoryById(id: number): Promise<Memory | null>;

  /**
   * Get a memory with its embedding data by ID and provider
   */
  getMemoryWithEmbeddingById(
    id: number,
    embeddingProvider: EmbeddingProviderType,
  ): Promise<MemoryWithEmbedding | null>;

  /**
   * Delete a memory by its ID
   */
  deleteMemory(id: number): Promise<boolean>;

  /**
   * Get all unique tags used in memories
   */
  listTags(): Promise<string[]>;

  /**
   * Get comprehensive statistics about stored memories
   */
  getStats(): Promise<MemoryStats>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;
}
