import { Ollama } from "ollama";
import OpenAI from "openai";
import { EmbeddingConfig, EmbeddingProvider } from "./types.js";

/**
 * OpenAI embedding provider implementation
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private openai: OpenAI;
  private model: string;
  private dimensions: number;

  constructor(apiKey: string, model: string, dimensions: number) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.dimensions = dimensions;
  }

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

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): "openai" | "ollama" {
    return "openai";
  }
}

/**
 * Ollama embedding provider implementation using the ollama library
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private ollama: Ollama;
  private model: string;
  private dimensions: number;

  constructor(baseUrl: string, model: string, dimensions: number) {
    this.ollama = new Ollama({ host: baseUrl });
    this.model = model;
    this.dimensions = dimensions;
  }

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

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Process embeddings individually as ollama library doesn't support batch
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): "openai" | "ollama" {
    return "ollama";
  }
}

/**
 * Factory function to create embedding providers based on configuration
 */
export function createEmbeddingProvider(
  config: EmbeddingConfig
): EmbeddingProvider {
  switch (config.provider) {
    case "openai":
      if (!config.apiKey) {
        throw new Error("OpenAI API key is required");
      }
      return new OpenAIEmbeddingProvider(
        config.apiKey,
        config.model,
        config.dimensions
      );

    case "ollama":
      if (!config.baseUrl) {
        throw new Error("Ollama base URL is required");
      }
      return new OllamaEmbeddingProvider(
        config.baseUrl,
        config.model,
        config.dimensions
      );

    default:
      throw new Error(`Unsupported embedding provider: ${config.provider}`);
  }
}

/**
 * Service for managing embeddings with configurable providers
 */
export class EmbeddingService {
  private provider: EmbeddingProvider;

  constructor(config: EmbeddingConfig) {
    this.provider = createEmbeddingProvider(config);
  }

  /**
   * Generate an embedding vector for the given text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.provider.generateEmbedding(text);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return this.provider.generateEmbeddings(texts);
  }

  /**
   * Get the configured embedding dimensions
   */
  getDimensions(): number {
    return this.provider.getDimensions();
  }

  /**
   * Get the configured model
   */
  getModel(): string {
    return this.provider.getModel();
  }

  /**
   * Get the configured provider
   */
  getProvider(): "openai" | "ollama" {
    return this.provider.getProvider();
  }
}
