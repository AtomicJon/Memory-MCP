import { EmbeddingProviderType } from '../embedding/embedding.types.js';

/**
 * Represents a stored memory entry in the database
 */
export type Memory = {
  /** Unique identifier for the memory */
  id: number;
  /** The actual preference or correction content */
  content: string;
  /** Optional code context where this memory applies */
  context?: string;
  /** Array of categorization tags for organizing memories */
  tags: string[];
  /** Timestamp when the memory was created */
  created_at: Date;
  /** Timestamp when the memory was last updated */
  updated_at: Date;
  /** Importance score from 1-5 for prioritization */
  importance_score: number;
};

/**
 * Represents a memory with its embedding information
 */
export type MemoryWithEmbedding = Memory & {
  /** Vector embedding for semantic similarity search */
  embedding: number[];
  /** The embedding model used to generate the vector */
  embedding_model: string;
  /** The embedding provider */
  embedding_provider: EmbeddingProviderType;
};

/**
 * Input parameters for creating a new memory
 */
export type CreateMemoryInput = {
  /** The preference or correction content to store */
  content: string;
  /** Optional code context where this applies */
  context?: string;
  /** Optional array of tags for categorization */
  tags?: string[];
  /** Optional importance score (1-5), defaults to 1 */
  importance_score?: number;
};

/**
 * Input parameters for searching memories by semantic similarity
 */
export type SearchMemoryInput = {
  /** The query text to search for similar memories */
  query: string;
  /** Maximum number of results to return, defaults to 10 */
  limit?: number;
  /** Minimum similarity threshold (0-1), defaults to 0.7 */
  similarity_threshold?: number;
  /** Optional array of tags to filter results */
  tags?: string[];
  /** Optional embedding provider to search within */
  embedding_provider?: EmbeddingProviderType;
  /** Optional specific model to filter by */
  embedding_model?: string;
};

/**
 * Result from a memory search operation
 */
export type SearchResult = {
  /** The memory that matched the search */
  memory: MemoryWithEmbedding;
  /** Cosine similarity score between query and memory (0-1) */
  similarity_score: number;
};

/**
 * Input parameters for listing memories with filters
 */
export type ListMemoriesInput = {
  /** Maximum number of results to return, defaults to 50 */
  limit?: number;
  /** Number of results to skip for pagination, defaults to 0 */
  offset?: number;
  /** Optional array of tags to filter by */
  tags?: string[];
  /** Minimum importance score to include */
  min_importance?: number;
  /** Start date for filtering (ISO string format) */
  start_date?: string;
  /** End date for filtering (ISO string format) */
  end_date?: string;
  /** Optional embedding provider to filter by */
  embedding_provider?: EmbeddingProviderType;
};
