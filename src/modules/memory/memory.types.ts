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
  createdAt: Date;
  /** Timestamp when the memory was last updated */
  updatedAt: Date;
  /** Importance score from 0-5 for prioritization */
  importanceScore: number;
};

/**
 * Represents a memory with its embedding information
 */
export type MemoryWithEmbedding = Memory & {
  /** Vector embedding for semantic similarity search */
  embedding: number[];
  /** The embedding model used to generate the vector */
  embeddingModel: string;
  /** The embedding provider */
  embeddingProvider: EmbeddingProviderType;
};

/**
 * Statistics about stored memories
 */
export type MemoryStats = {
  totalMemories: number;
  avgImportance: number;
  uniqueTags: string[];
  openaiEmbeddings: number;
  ollamaEmbeddings: number;
};
