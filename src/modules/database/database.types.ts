import { EmbeddingProviderType } from '../embedding/embedding.types.js';
import { MemoryWithEmbedding } from '../memory/index.js';

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
  importanceScore?: number;
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
  similarityThreshold?: number;
  /** Optional array of tags to filter results */
  tags?: string[];
  /** Optional embedding provider to search within */
  embeddingProvider?: EmbeddingProviderType;
  /** Optional specific model to filter by */
  embeddingModel?: string;
};

/**
 * Result from a memory search operation
 */
export type SearchResult = {
  /** The memory that matched the search */
  memory: MemoryWithEmbedding;
  /** Cosine similarity score between query and memory (0-1) */
  similarityScore: number;
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
  minImportance?: number;
  /** Start date for filtering (ISO string format) */
  startDate?: string;
  /** End date for filtering (ISO string format) */
  endDate?: string;
  /** Optional embedding provider to filter by */
  embeddingProvider?: EmbeddingProviderType;
};

/**
 * Internal types for database row results with camelCase conversion
 */
export type MemoryRow = {
  id: number;
  content: string;
  context?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  importance_score: number;
};

export type MemoryWithEmbeddingRow = MemoryRow & {
  embedding: string;
  model: string;
};

export type SearchResultRow = MemoryWithEmbeddingRow & {
  similarity_score: string;
};

export type StatsRow = {
  total_memories: string;
  avg_importance: string;
};

export type TagRow = {
  tag: string;
};

export type CountRow = {
  count: string;
};
