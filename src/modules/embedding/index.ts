/**
 * Embedding module exports
 * Provides embedding generation services with support for multiple providers
 */

export { EmbeddingService } from "./service.js";
export { createEmbeddingProvider } from "./factory.js";
export { OpenAIEmbeddingProvider } from "./providers/openai.js";
export { OllamaEmbeddingProvider } from "./providers/ollama.js";