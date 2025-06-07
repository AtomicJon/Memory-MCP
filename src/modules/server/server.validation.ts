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
 * Validates arguments for the storeMemory tool
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
    isOptionalNumberInRange(input.importanceScore, 1, 5)
  );
}

/**
 * Validates arguments for the searchMemories tool
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
    isOptionalNumber(input.similarityThreshold) &&
    isOptionalStringArray(input.tags) &&
    isOptionalEnumValue(input.embeddingProvider, EmbeddingProviderType) &&
    isOptionalString(input.embeddingModel)
  );
}

/**
 * Validates arguments for the listMemories tool
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
    isOptionalNumber(input.minImportance) &&
    isOptionalString(input.startDate) &&
    isOptionalString(input.endDate) &&
    isOptionalEnumValue(input.embeddingProvider, EmbeddingProviderType)
  );
}

/**
 * Validates arguments for the deleteMemory tool
 * @param args - Unknown input arguments to validate
 * @returns True if args contains a valid memoryId number, false otherwise
 */
export function isValidDeleteMemoryArgs(
  args: unknown,
): args is { memoryId: number } {
  if (!isObject(args)) return false;

  const input = args as { memoryId: number };
  return typeof input.memoryId === 'number';
}
