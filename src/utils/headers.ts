/**
 * Converts a header value to a string
 *
 * @param headers The headers object
 * @param key The key of the header to convert
 * @returns {string} The header value as a string
 * @example
 * toString({ 'content-type': 'application/json' }, 'content-type')
 * // => 'application/json'
 */
export function toString(headers: any, key: string): string {
  const value = headers[key];
  return Array.isArray(value) ? value[0] : value || '';
}
