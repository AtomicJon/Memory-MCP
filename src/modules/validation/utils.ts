/**
 * Generic validation utilities for type checking
 * These utilities are domain-agnostic and can be reused across different modules
 */

/**
 * Checks if a value is a plain object (not null, array, or other object types)
 * @param value - The value to check
 * @returns True if the value is a plain object, false otherwise
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Checks if a value is a string
 * @param value - The value to check
 * @returns True if the value is a string, false otherwise
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Checks if a value is a number
 * @param value - The value to check
 * @returns True if the value is a number, false otherwise
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

/**
 * Checks if a value is either a string or undefined
 * @param value - The value to check
 * @returns True if the value is a string or undefined, false otherwise
 */
export function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

/**
 * Checks if a value is either a number or undefined
 * @param value - The value to check
 * @returns True if the value is a number or undefined, false otherwise
 */
export function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || isNumber(value);
}

/**
 * Checks if a value is an array
 * @param value - The value to check
 * @returns True if the value is an array, false otherwise
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is either an array or undefined
 * @param value - The value to check
 * @returns True if the value is an array or undefined, false otherwise
 */
export function isOptionalArray(value: unknown): value is unknown[] | undefined {
  return value === undefined || isArray(value);
}

/**
 * Checks if a value is an array of strings
 * @param value - The value to check
 * @returns True if the value is an array where all elements are strings, false otherwise
 */
export function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

/**
 * Checks if a value is either an array of strings or undefined
 * @param value - The value to check
 * @returns True if the value is an array of strings or undefined, false otherwise
 */
export function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || isStringArray(value);
}

/**
 * Checks if a value is a valid enum value
 * @param value - The value to check
 * @param enumObj - The enum object to check against
 * @returns True if the value is a valid enum value, false otherwise
 */
export function isEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumObj: T
): value is T[keyof T] {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

/**
 * Checks if a value is either a valid enum value or undefined
 * @param value - The value to check
 * @param enumObj - The enum object to check against
 * @returns True if the value is a valid enum value or undefined, false otherwise
 */
export function isOptionalEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumObj: T
): value is T[keyof T] | undefined {
  return value === undefined || isEnumValue(value, enumObj);
}

/**
 * Checks if a value is a number within a specified range (inclusive)
 * @param value - The value to check
 * @param min - The minimum allowed value (inclusive)
 * @param max - The maximum allowed value (inclusive)
 * @returns True if the value is a number within the specified range, false otherwise
 */
export function isNumberInRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Checks if a value is either a number within a specified range or undefined
 * @param value - The value to check
 * @param min - The minimum allowed value (inclusive)
 * @param max - The maximum allowed value (inclusive)
 * @returns True if the value is a number within the specified range or undefined, false otherwise
 */
export function isOptionalNumberInRange(
  value: unknown,
  min: number,
  max: number
): value is number | undefined {
  return value === undefined || isNumberInRange(value, min, max);
}