import {
  EmbeddingConfig,
  EmbeddingProvider,
  EmbeddingProviderType,
} from '../../types.js';
import { OpenAIEmbeddingProvider } from './providers/openai.js';
import { OllamaEmbeddingProvider } from './providers/ollama.js';

/**
 * Factory function to create embedding providers based on configuration
 * Supports creating providers for OpenAI and Ollama embedding services
 * @param config - Configuration object specifying provider type and connection details
 * @returns An instance of the appropriate embedding provider
 * @throws Error if the provider type is unsupported or required configuration is missing
 */
export function createEmbeddingProvider(
  config: EmbeddingConfig,
): EmbeddingProvider {
  switch (config.provider) {
    case EmbeddingProviderType.OPENAI:
      if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIEmbeddingProvider(
        config.apiKey,
        config.model,
        config.dimensions,
      );

    case EmbeddingProviderType.OLLAMA:
      if (!config.baseUrl) {
        throw new Error('Ollama base URL is required');
      }
      return new OllamaEmbeddingProvider(
        config.baseUrl,
        config.model,
        config.dimensions,
      );

    default:
      throw new Error(`Unsupported embedding provider: ${config.provider}`);
  }
}
