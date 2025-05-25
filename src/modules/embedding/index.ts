/**
 * Embedding module exports
 * Provides embedding generation services with support for multiple providers
 */

export { EmbeddingService } from './embedding.service.js';
export { createEmbeddingProvider } from './embedding.factory.js';
export { OpenAIEmbeddingProvider } from './providers/openai.provider.js';
export { OllamaEmbeddingProvider } from './providers/ollama.provider.js';
export * from './embedding.types.js';
