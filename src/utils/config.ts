import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { OutgoingHttpHeaders } from 'node:http';
import type { ConnectionInfo, ForwardValidationResult } from './server';
import { debug } from './console';

/**
 * Route configuration for a specific domain/host
 */
export interface RouteConfig {
  /** Target host:port to proxy to */
  target: string;
  /** Enable SSL/TLS for the target */
  ssl?: boolean;
  /** Remap the URL path before forwarding */
  remap?: (url: string) => string;
  /** Custom CORS configuration */
  cors?: CorsConfig;
  /** Validation function for this route */
  validate?: (info: ConnectionInfo) => Promise<ForwardValidationResult>;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  /** Allowed origins (array of strings or '*' for all) */
  origin?: string | string[];
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Exposed headers */
  exposedHeaders?: string[];
  /** Allow credentials */
  credentials?: boolean;
  /** Max age for preflight cache */
  maxAge?: number;
}

/**
 * SSL/TLS certificate configuration
 */
export interface CertificateConfig {
  /** Path to private key file or key content */
  key: string;
  /** Path to certificate file or cert content */
  cert: string;
  /** Path to CA file or CA content */
  ca?: string;
  /** Allow HTTP/1.1 fallback */
  allowHTTP1?: boolean;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  /** SSL/TLS certificate configuration */
  ssl?: CertificateConfig;
  /** Route configurations mapped by host */
  routes: Record<string, RouteConfig>;
  /** Default CORS configuration */
  cors?: CorsConfig;
  /** Global validation function */
  validate?: (info: ConnectionInfo) => Promise<ForwardValidationResult>;
  /** Ports to listen on (defaults to [443, 8080, 9229]) */
  ports?: number[];
}

/**
 * Processed SSL configuration with loaded certificates
 */
export interface LoadedSSLConfig {
  key: Buffer;
  cert: Buffer;
  ca?: Buffer;
  allowHTTP1: boolean;
}

/**
 * Proxy configuration object with loaded SSL
 */
export interface ProxyConfig {
  config: ServerConfig;
  sslConfig?: LoadedSSLConfig;
  getSSL: () => LoadedSSLConfig | undefined;
  getRoute: (host: string) => RouteConfig | undefined;
  getTarget: (host: string) => {
    target: string | undefined;
    ssl: LoadedSSLConfig | undefined;
    remap: ((url: string) => string) | undefined;
  };
  getCorsHeaders: (origin: string, host?: string) => OutgoingHttpHeaders;
  validate: (info: ConnectionInfo) => Promise<ForwardValidationResult>;
  getPorts: () => number[];
  getConfig: () => ServerConfig;
}

/**
 * Load SSL key from file or inline string
 */
function loadSSLKey(keyConfig: string): Promise<Buffer> {
  debug(`Loading SSL key from: ${keyConfig.includes('-----BEGIN') ? 'inline' : keyConfig}`);
  return keyConfig.includes('-----BEGIN') ? Promise.resolve(Buffer.from(keyConfig)) : readFile(resolve(keyConfig));
}

/**
 * Load SSL certificate from file or inline string
 */
function loadSSLCert(certConfig: string): Promise<Buffer> {
  debug(`Loading SSL cert from: ${certConfig.includes('-----BEGIN') ? 'inline' : certConfig}`);
  return certConfig.includes('-----BEGIN') ? Promise.resolve(Buffer.from(certConfig)) : readFile(resolve(certConfig));
}

/**
 * Load SSL CA from file or inline string
 */
function loadSSLCA(caConfig: string | undefined): Promise<Buffer | undefined> {
  if (!caConfig) {
    debug('Loading SSL CA from: none');
    return Promise.resolve(undefined);
  }

  debug(`Loading SSL CA from: ${caConfig.includes('-----BEGIN') ? 'inline' : caConfig}`);
  return caConfig.includes('-----BEGIN') ? Promise.resolve(Buffer.from(caConfig)) : readFile(resolve(caConfig));
}

/**
 * Initialize SSL configuration asynchronously
 */
function initializeSSL(sslConfig: CertificateConfig): Promise<LoadedSSLConfig> {
  debug('Initializing SSL configuration...');

  return Promise.all([loadSSLKey(sslConfig.key), loadSSLCert(sslConfig.cert), loadSSLCA(sslConfig.ca)])
    .then(([key, cert, ca]) => {
      const loaded: LoadedSSLConfig = {
        key,
        cert,
        ca,
        allowHTTP1: sslConfig.allowHTTP1 ?? true,
      };

      debug('SSL configuration loaded successfully', {
        keySize: key.length,
        certSize: cert.length,
        caSize: ca?.length || 0,
        allowHTTP1: loaded.allowHTTP1,
      });

      return loaded;
    })
    .catch((error) => {
      debug('Failed to load SSL certificates', error);
      console.error('Failed to load SSL certificates:', error);
      throw error;
    });
}

/**
 * Get route configuration for a host
 */
function getRoute(config: ServerConfig, host: string): RouteConfig | undefined {
  if (config.routes[host]) {
    return config.routes[host];
  }

  const hostWithoutPort = host.split(':')[0];
  if (config.routes[hostWithoutPort]) {
    return config.routes[hostWithoutPort];
  }

  for (const [pattern, route] of Object.entries(config.routes)) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(host) || regex.test(hostWithoutPort)) {
        return route;
      }
    }
  }

  return undefined;
}

/**
 * Get target for a host
 */
function getTarget(
  config: ServerConfig,
  sslConfig: LoadedSSLConfig | undefined,
  host: string
): { target: string | undefined; ssl: LoadedSSLConfig | undefined; remap: ((url: string) => string) | undefined } {
  const route = getRoute(config, host);
  if (!route) {
    return { target: undefined, ssl: undefined, remap: undefined };
  }

  return {
    target: route.target,
    ssl: route.ssl ? sslConfig : undefined,
    remap: route.remap,
  };
}

/**
 * Get CORS headers for a request
 */
function getCorsHeaders(config: ServerConfig, origin: string, host?: string): OutgoingHttpHeaders {
  const route = host ? getRoute(config, host) : undefined;
  const corsConfig = route?.cors || config.cors;

  if (!corsConfig) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-credentials': 'true',
    };
  }

  const headers: OutgoingHttpHeaders = {};

  /* Origin */
  if (corsConfig.origin === '*') {
    headers['access-control-allow-origin'] = '*';
  } else if (Array.isArray(corsConfig.origin)) {
    if (corsConfig.origin.includes(origin)) {
      headers['access-control-allow-origin'] = origin;
    }
  } else if (corsConfig.origin) {
    headers['access-control-allow-origin'] = corsConfig.origin;
  } else {
    headers['access-control-allow-origin'] = origin;
  }

  /* Methods */
  if (corsConfig.methods) {
    headers['access-control-allow-methods'] = corsConfig.methods.join(', ');
  } else {
    headers['access-control-allow-methods'] = '*';
  }

  /* Headers */
  if (corsConfig.allowedHeaders) {
    headers['access-control-allow-headers'] = corsConfig.allowedHeaders.join(', ');
  } else {
    headers['access-control-allow-headers'] = '*';
  }

  /* Exposed headers */
  if (corsConfig.exposedHeaders) {
    headers['access-control-expose-headers'] = corsConfig.exposedHeaders.join(', ');
  }

  /* Credentials */
  if (corsConfig.credentials !== undefined) {
    headers['access-control-allow-credentials'] = corsConfig.credentials ? 'true' : 'false';
  } else {
    headers['access-control-allow-credentials'] = 'true';
  }

  /* Max age */
  if (corsConfig.maxAge) {
    headers['access-control-max-age'] = corsConfig.maxAge.toString();
  }

  return headers;
}

/**
 * Validate a request
 */
function validateRequest(config: ServerConfig, info: ConnectionInfo): Promise<ForwardValidationResult> {
  const route = getRoute(config, info.authority);
  if (route?.validate) return route.validate(info);
  if (config.validate) return config.validate(info);

  return Promise.resolve({ status: true });
}

/**
 * Get ports to listen on
 */
function getPorts(config: ServerConfig): number[] {
  return config.ports || [443, 8080, 9229];
}

/**
 * Create a ProxyConfig object with all helper functions bound
 */
function createProxyConfig(config: ServerConfig, sslConfig?: LoadedSSLConfig): ProxyConfig {
  return {
    config,
    sslConfig,
    getSSL: () => sslConfig,
    getRoute: (host: string) => getRoute(config, host),
    getTarget: (host: string) => getTarget(config, sslConfig, host),
    getCorsHeaders: (origin: string, host?: string) => getCorsHeaders(config, origin, host),
    validate: (info: ConnectionInfo) => validateRequest(config, info),
    getPorts: () => getPorts(config),
    getConfig: () => config,
  };
}

/**
 * Deep merge objects with priority to later arguments
 */
function deepMerge(...objects: any[]): any {
  const result: any = {};

  for (const obj of objects) {
    if (!obj) continue;

    for (const key in obj) {
      if (obj[key] === undefined) continue;

      if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key] !== null) {
        result[key] = deepMerge(result[key] || {}, obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
  }

  return result;
}

/**
 * Load configuration from environment variables (returns partial config)
 */
function getConfigFromEnv(): Partial<ServerConfig> {
  debug('Loading configuration from environment variables...');
  const config: Partial<ServerConfig> = {};

  /* Load SSL config */
  if (process.env.SSL_KEY && process.env.SSL_CERT) {
    debug('Found SSL configuration in environment variables');
    config.ssl = {
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT,
      ca: process.env.SSL_CA,
      allowHTTP1: process.env.SSL_ALLOW_HTTP1 === 'true',
    };
  }

  /* Load CORS config */
  if (process.env.CORS_ORIGIN) {
    debug('Found CORS configuration in environment variables', {
      origin: process.env.CORS_ORIGIN,
      methods: process.env.CORS_METHODS,
      headers: process.env.CORS_HEADERS,
      credentials: process.env.CORS_CREDENTIALS,
    });
    config.cors = {
      origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(','),
      methods: process.env.CORS_METHODS?.split(','),
      allowedHeaders: process.env.CORS_HEADERS?.split(','),
      credentials: process.env.CORS_CREDENTIALS === 'true',
    };
  }

  if (Object.keys(config).length === 0) {
    debug('No configuration found in environment variables');
  }

  return config;
}

/**
 * Load configuration from file asynchronously (returns partial config)
 * Supports: .json, .ts, .js
 * Since we're running with tsx, all JS/TS files are supported through dynamic import
 */
async function getConfigFromFile(): Promise<Partial<ServerConfig>> {
  const configPath = process.env.PROXY_CONFIG || './proxy.config.json';
  const resolvedPath = resolve(configPath);

  debug(`Looking for config file at: ${resolvedPath}`);

  try {
    // Check if file exists
    const stats = await stat(resolvedPath);
    debug(`Config file found (${stats.size} bytes)`);

    /* JSON files */
    if (resolvedPath.endsWith('.json')) {
      debug('Loading JSON config file...');
      const configFile = await readFile(resolvedPath, 'utf-8');
      const config = JSON.parse(configFile) as Partial<ServerConfig>;
      debug('JSON config loaded successfully', {
        routes: Object.keys(config.routes || {}),
        hasCors: !!config.cors,
        hasSsl: !!config.ssl,
        ports: config.ports,
      });
      return config;
    }

    /* TypeScript/JavaScript files - tsx handles both */
    if (resolvedPath.endsWith('.ts') || resolvedPath.endsWith('.js')) {
      const fileType = resolvedPath.endsWith('.ts') ? 'TypeScript' : 'JavaScript';
      debug(`Loading ${fileType} config file...`);
      const configModule = await import(`file://${resolvedPath}`);
      const config = configModule.default || configModule;
      debug(`${fileType} config loaded successfully`, {
        routes: Object.keys(config.routes || {}),
        hasCors: !!config.cors,
        hasSsl: !!config.ssl,
        ports: config.ports,
      });
      return config;
    }

    /* Default: JSON */
    debug('Loading config as JSON (no extension match)...');
    const configFile = await readFile(resolvedPath, 'utf-8');
    const config = JSON.parse(configFile) as Partial<ServerConfig>;
    debug('Config loaded successfully', {
      routes: Object.keys(config.routes || {}),
      hasCors: !!config.cors,
      hasSsl: !!config.ssl,
      ports: config.ports,
    });
    return config;
  } catch (error) {
    // File doesn't exist or can't be read - return empty config
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      debug(`Config file not found: ${resolvedPath}`);
    } else {
      debug(`Error loading config file: ${(error as Error).message}`);
    }
    return {};
  }
}

/**
 * Step 1: Load default configuration
 */
function loadDefaults(): ServerConfig {
  debug('==========================================');
  debug('Starting configuration loading process...');
  debug('==========================================');
  debug('Step 1: Loading default configuration...');

  const defaults: ServerConfig = {
    routes: {},
    cors: {
      origin: '*',
      credentials: true,
    },
  };

  debug('Defaults loaded', defaults);
  return defaults;
}

/**
 * Step 2: Load and merge file configuration
 */
function loadAndMergeFileConfig(defaults: ServerConfig): Promise<ServerConfig> {
  debug('Step 2: Loading configuration from file...');

  return getConfigFromFile().then((fileConfig) => {
    if (Object.keys(fileConfig).length > 0) {
      debug('File config loaded', fileConfig);
    } else {
      debug('No file configuration loaded');
    }
    return deepMerge(defaults, fileConfig);
  });
}

/**
 * Step 3: Merge environment configuration
 */
function mergeEnvConfig(config: ServerConfig): ServerConfig {
  debug('Step 3: Loading configuration from environment...');
  const envConfig = getConfigFromEnv();
  return deepMerge(config, envConfig);
}

/**
 * Step 4: Merge programmatic configuration
 */
function mergeProgrammaticConfig(config: ServerConfig, programmaticConfig?: Partial<ServerConfig>): ServerConfig {
  if (programmaticConfig && Object.keys(programmaticConfig).length > 0) {
    debug('Step 4: Programmatic configuration provided', programmaticConfig);
    return deepMerge(config, programmaticConfig);
  }
  return config;
}

/**
 * Step 5: Log final merged configuration
 */
function logMergedConfig(merged: ServerConfig): ServerConfig {
  debug('Step 5: Final merged configuration', {
    routes: Object.keys(merged.routes || {}),
    ports: merged.ports,
    hasCors: !!merged.cors,
    hasSsl: !!merged.ssl,
    hasValidate: !!merged.validate,
  });
  return merged;
}

/**
 * Step 6: Initialize SSL if configured
 */
function initializeSSLIfConfigured(
  config: ServerConfig
): Promise<{ config: ServerConfig; sslConfig?: LoadedSSLConfig }> {
  debug('Step 6: Checking SSL configuration...');

  if (!config.ssl) {
    debug('No SSL configuration provided');
    return Promise.resolve({ config, sslConfig: undefined });
  }

  return initializeSSL(config.ssl).then((sslConfig) => ({ config, sslConfig }));
}

/**
 * Step 7: Create final ProxyConfig object
 */
function createFinalConfig({ config, sslConfig }: { config: ServerConfig; sslConfig?: LoadedSSLConfig }): ProxyConfig {
  debug('Step 7: Creating ProxyConfig object...');
  const proxyConfig = createProxyConfig(config, sslConfig);

  debug('==========================================');
  debug('Configuration loading completed successfully');
  debug('==========================================');

  return proxyConfig;
}

/**
 * Load configuration with cascading priority using promise chain:
 * 1. Programmatic config (highest priority)
 * 2. Environment variables
 * 3. Config file
 * 4. Defaults (lowest priority)
 *
 * Supports config file types: .json, .ts, .js
 */
export function loadConfig(programmaticConfig?: Partial<ServerConfig>): Promise<ProxyConfig> {
  return Promise.resolve(loadDefaults())
    .then((defaults) => loadAndMergeFileConfig(defaults))
    .then((config) => mergeEnvConfig(config))
    .then((config) => mergeProgrammaticConfig(config, programmaticConfig))
    .then((merged) => logMergedConfig(merged))
    .then((merged) => initializeSSLIfConfigured(merged))
    .then((result) => createFinalConfig(result));
}
