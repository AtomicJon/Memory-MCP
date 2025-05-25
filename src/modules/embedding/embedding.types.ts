/**
 * Enum for embedding provider types
 */
export enum EmbeddingProviderType {
  OPENAI = 'openai',
  OLLAMA = 'ollama',
}

/**
 * Configuration for embedding providers
 */
export type EmbeddingConfig = {
  /** The embedding provider to use */
  provider: EmbeddingProviderType;
  /** API key for OpenAI (required if provider is 'openai') */
  apiKey?: string;
  /** Base URL for Ollama API (required if provider is 'ollama') */
  baseUrl?: string;
  /** Model name to use for embeddings */
  model: string;
  /** Dimension size of the embedding vectors */
  dimensions: number;
};

/**
 * Interface for embedding providers
 */
export interface EmbeddingProvider {
  /** Generate an embedding vector for the given text */
  generateEmbedding(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts */
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  /** Get the dimension size of embeddings */
  getDimensions(): number;
  /** Get the model name */
  getModel(): string;
  /** Get the provider type */
  getProvider(): EmbeddingProviderType;
}
