import { Ollama } from "ollama";
import { EmbeddingProvider, EmbeddingProviderType } from "../../../types.js";

/**
 * Ollama embedding provider implementation using the ollama library
 * Provides vector embeddings using locally hosted Ollama models
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private ollama: Ollama;
  private model: string;
  private dimensions: number;

  /**
   * Creates a new Ollama embedding provider
   * @param baseUrl - The base URL for the Ollama API (e.g., 'http://localhost:11434')
   * @param model - The Ollama model to use for embeddings (e.g., 'nomic-embed-text')
   * @param dimensions - The dimension size of the embedding vectors
   */
  constructor(baseUrl: string, model: string, dimensions: number) {
    this.ollama = new Ollama({ host: baseUrl });
    this.model = model;
    this.dimensions = dimensions;
  }

  /**
   * Generate an embedding vector for a single text input
   * @param text - The text to generate an embedding for
   * @returns Promise resolving to the embedding vector as an array of numbers
   * @throws Error if the Ollama API call fails or returns invalid data
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.ollama.embeddings({
        model: this.model,
        prompt: text,
      });

      if (!response.embedding || !Array.isArray(response.embedding)) {
        throw new Error("Invalid response: missing or invalid embedding");
      }

      return response.embedding;
    } catch (error) {
      throw new Error(
        `Ollama embedding error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate embedding vectors for multiple text inputs
   * Note: Ollama processes embeddings individually as the library doesn't support batch operations
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise resolving to an array of embedding vectors
   * @throws Error if any Ollama API call fails
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Get the configured embedding dimensions
   * @returns The number of dimensions in the embedding vectors
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Get the configured model name
   * @returns The Ollama model name being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the provider type identifier
   * @returns The embedding provider type (always OLLAMA for this class)
   */
  getProvider(): EmbeddingProviderType {
    return EmbeddingProviderType.OLLAMA;
  }
}