import {
  CreateMemoryInput,
  SearchMemoryInput,
  ListMemoriesInput,
} from '../database/database.types.js';
import { EmbeddingProviderType } from '../embedding/embedding.types.js';
import {
  isObject,
  isString,
  isOptionalString,
  isOptionalStringArray,
  isOptionalNumberInRange,
  isOptionalNumber,
  isOptionalEnumValue,
} from '../validation/index.js';

/**
 * Domain-specific validation functions for MCP server tool arguments
 * These functions validate the structure and types of input parameters for memory operations
 */

/**
 * Validates arguments for the store_memory tool
 * @param args - Unknown input arguments to validate
 * @returns True if args is a valid CreateMemoryInput, false otherwise
 */
export function isValidStoreMemoryArgs(
  args: unknown,
): args is CreateMemoryInput {
  if (!isObject(args)) return false;

  const input = args as CreateMemoryInput;

  return (
    isString(input.content) &&
    isOptionalString(input.context) &&
    isOptionalStringArray(input.tags) &&
    isOptionalNumberInRange(input.importance_score, 1, 5)
  );
}

/**
 * Validates arguments for the search_memories tool
 * @param args - Unknown input arguments to validate
 * @returns True if args is a valid SearchMemoryInput, false otherwise
 */
export function isValidSearchMemoriesArgs(
  args: unknown,
): args is SearchMemoryInput {
  if (!isObject(args)) return false;

  const input = args as SearchMemoryInput;

  return (
    isString(input.query) &&
    isOptionalNumber(input.limit) &&
    isOptionalNumber(input.similarity_threshold) &&
    isOptionalStringArray(input.tags) &&
    isOptionalEnumValue(input.embedding_provider, EmbeddingProviderType) &&
    isOptionalString(input.embedding_model)
  );
}

/**
 * Validates arguments for the list_memories tool
 * @param args - Unknown input arguments to validate
 * @returns True if args is a valid ListMemoriesInput, false otherwise
 */
export function isValidListMemoriesArgs(
  args: unknown,
): args is ListMemoriesInput {
  if (!isObject(args)) return false;

  const input = args as ListMemoriesInput;

  return (
    isOptionalNumber(input.limit) &&
    isOptionalNumber(input.offset) &&
    isOptionalStringArray(input.tags) &&
    isOptionalNumber(input.min_importance) &&
    isOptionalString(input.start_date) &&
    isOptionalString(input.end_date) &&
    isOptionalEnumValue(input.embedding_provider, EmbeddingProviderType)
  );
}

/**
 * Validates arguments for the delete_memory tool
 * @param args - Unknown input arguments to validate
 * @returns True if args contains a valid memory_id number, false otherwise
 */
export function isValidDeleteMemoryArgs(
  args: unknown,
): args is { memory_id: number } {
  if (!isObject(args)) return false;

  const input = args as { memory_id: number };
  return typeof input.memory_id === 'number';
}
