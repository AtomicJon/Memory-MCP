import OpenAI from "openai";
import { EmbeddingProvider, EmbeddingProviderType } from "../../../types.js";

/**
 * OpenAI embedding provider implementation
 * Provides vector embeddings using OpenAI's embedding models
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private openai: OpenAI;
  private model: string;
  private dimensions: number;

  /**
   * Creates a new OpenAI embedding provider
   * @param apiKey - OpenAI API key for authentication
   * @param model - The OpenAI model to use for embeddings (e.g., 'text-embedding-3-small')
   * @param dimensions - The dimension size of the embedding vectors
   */
  constructor(apiKey: string, model: string, dimensions: number) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.dimensions = dimensions;
  }

  /**
   * Generate an embedding vector for a single text input
   * @param text - The text to generate an embedding for
   * @returns Promise resolving to the embedding vector as an array of numbers
   * @throws Error if the OpenAI API call fails
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new Error(
        `OpenAI embedding error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate embedding vectors for multiple text inputs in batch
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise resolving to an array of embedding vectors
   * @throws Error if the OpenAI API call fails
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
      });

      return response.data.map(
        (item: { embedding: number[] }) => item.embedding
      );
    } catch (error) {
      throw new Error(
        `OpenAI embeddings error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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
   * @returns The OpenAI model name being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the provider type identifier
   * @returns The embedding provider type (always OPENAI for this class)
   */
  getProvider(): EmbeddingProviderType {
    return EmbeddingProviderType.OPENAI;
  }
}