import {
  EmbeddingConfig,
  EmbeddingProvider,
  EmbeddingProviderType,
} from '../../types.js';
import { createEmbeddingProvider } from './factory.js';

/**
 * Service for managing embeddings with configurable providers
 * Acts as a facade over different embedding providers (OpenAI, Ollama)
 */
export class EmbeddingService {
  private provider: EmbeddingProvider;

  /**
   * Creates a new embedding service with the specified configuration
   * @param config - Configuration object specifying provider type and connection details
   * @throws Error if the provider configuration is invalid
   */
  constructor(config: EmbeddingConfig) {
    this.provider = createEmbeddingProvider(config);
  }

  /**
   * Generate an embedding vector for the given text
   * @param text - The text to generate an embedding for
   * @returns Promise resolving to the embedding vector as an array of numbers
   * @throws Error if the embedding generation fails
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.provider.generateEmbedding(text);
  }

  /**
   * Generate embeddings for multiple texts
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise resolving to an array of embedding vectors
   * @throws Error if any embedding generation fails
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return this.provider.generateEmbeddings(texts);
  }

  /**
   * Get the configured embedding dimensions
   * @returns The number of dimensions in the embedding vectors
   */
  getDimensions(): number {
    return this.provider.getDimensions();
  }

  /**
   * Get the configured model name
   * @returns The model name being used for embeddings
   */
  getModel(): string {
    return this.provider.getModel();
  }

  /**
   * Get the configured provider type
   * @returns The embedding provider type (OpenAI or Ollama)
   */
  getProvider(): EmbeddingProviderType {
    return this.provider.getProvider();
  }
}
