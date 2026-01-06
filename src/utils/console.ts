/**
 * Debug logger - only logs when DEBUG env var is set to 'true'
 *
 * @param message - The message to log
 * @param data - The data to log
 * @returns void
 * @example
 * debug('Configuration loaded successfully', {
 *   routes: Object.keys(config.routes || {}),
 *   ports: config.ports,
 *   hasCors: !!config.cors,
 *   hasSsl: !!config.ssl,
 *   hasValidate: !!config.validate,
 * });
 */
export function debug(message: string, data?: any) {
  if (process.env.DEBUG === 'true') {
    const timestamp = new Date().toISOString();
    if (data !== undefined) {
      const sanitized = JSON.stringify(data, (_, value) => (typeof value === 'function' ? '<function>' : value), 2);
      return console.log(`[${timestamp}] [CONFIG] ${message}`, sanitized);
    }
    return console.log(`[${timestamp}] [CONFIG] ${message}`);
  }
}
