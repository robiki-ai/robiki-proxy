import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OutgoingHttpHeaders } from 'node:http';
import type { ConnectionInfo, ForwardValidationResult } from './server';

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
 * Proxy configuration manager
 */
export class ProxyConfig {
  private config: ServerConfig;
  private sslConfig?: { key: Buffer; cert: Buffer; ca?: Buffer; allowHTTP1?: boolean };

  constructor(config: ServerConfig) {
    this.config = config;
    this.initializeSSL();
  }

  /**
   * Initialize SSL configuration
   */
  private initializeSSL() {
    if (!this.config.ssl) return;

    try {
      const key = this.config.ssl.key.includes('-----BEGIN')
        ? Buffer.from(this.config.ssl.key)
        : readFileSync(resolve(this.config.ssl.key));

      const cert = this.config.ssl.cert.includes('-----BEGIN')
        ? Buffer.from(this.config.ssl.cert)
        : readFileSync(resolve(this.config.ssl.cert));

      const ca = this.config.ssl.ca
        ? this.config.ssl.ca.includes('-----BEGIN')
          ? Buffer.from(this.config.ssl.ca)
          : readFileSync(resolve(this.config.ssl.ca))
        : undefined;

      this.sslConfig = {
        key,
        cert,
        ca,
        allowHTTP1: this.config.ssl.allowHTTP1 ?? true,
      };
    } catch (error) {
      console.error('Failed to load SSL certificates:', error);
      throw error;
    }
  }

  /**
   * Get SSL configuration
   */
  getSSL() {
    return this.sslConfig;
  }

  /**
   * Get route configuration for a host
   */
  getRoute(host: string): RouteConfig | undefined {
    if (this.config.routes[host]) {
      return this.config.routes[host];
    }

    const hostWithoutPort = host.split(':')[0];
    if (this.config.routes[hostWithoutPort]) {
      return this.config.routes[hostWithoutPort];
    }

    for (const [pattern, route] of Object.entries(this.config.routes)) {
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
  getTarget(host: string) {
    const route = this.getRoute(host);
    if (!route) {
      return { target: undefined, ssl: undefined, remap: undefined };
    }

    return {
      target: route.target,
      ssl: route.ssl ? this.sslConfig : undefined,
      remap: route.remap,
    };
  }

  /**
   * Get CORS headers for a request
   */
  getCorsHeaders(origin: string, host?: string): OutgoingHttpHeaders {
    const route = host ? this.getRoute(host) : undefined;
    const corsConfig = route?.cors || this.config.cors;

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
  async validate(info: ConnectionInfo): Promise<ForwardValidationResult> {
    const route = this.getRoute(info.authority);
    if (route?.validate) return route.validate(info);
    if (this.config.validate) return this.config.validate(info);

    return { status: true };
  }

  /**
   * Get ports to listen on
   */
  getPorts(): number[] {
    return this.config.ports || [443, 8080, 9229];
  }

  /**
   * Get the full configuration
   */
  getConfig(): ServerConfig {
    return this.config;
  }
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
  const config: Partial<ServerConfig> = {};

  /* Load SSL config */
  if (process.env.SSL_KEY && process.env.SSL_CERT) {
    config.ssl = {
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT,
      ca: process.env.SSL_CA,
      allowHTTP1: process.env.SSL_ALLOW_HTTP1 === 'true',
    };
  }

  /* Load CORS config */
  if (process.env.CORS_ORIGIN) {
    config.cors = {
      origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(','),
      methods: process.env.CORS_METHODS?.split(','),
      allowedHeaders: process.env.CORS_HEADERS?.split(','),
      credentials: process.env.CORS_CREDENTIALS === 'true',
    };
  }

  return config;
}

/**
 * Load configuration from file (returns partial config)
 */
function getConfigFromFile(): Partial<ServerConfig> {
  const configPath = process.env.PROXY_CONFIG || './proxy.config.json';

  try {
    const configFile = readFileSync(resolve(configPath), 'utf-8');
    return JSON.parse(configFile) as Partial<ServerConfig>;
  } catch (error) {
    return {};
  }
}

/**
 * Load configuration with cascading priority:
 * 1. Programmatic config (highest priority)
 * 2. Environment variables
 * 3. Config file
 * 4. Defaults (lowest priority)
 */
export function loadConfig(programmaticConfig?: Partial<ServerConfig>): ProxyConfig {
  /* 1. Start with defaults */
  const defaults: ServerConfig = {
    routes: {},
    cors: {
      origin: '*',
      credentials: true,
    },
  };

  /* 2. Load from config file */
  const fileConfig = getConfigFromFile();

  /* 3. Load from environment variables */
  const envConfig = getConfigFromEnv();

  /* 4. Merge with priority: programmatic > env > file > defaults */
  const merged = deepMerge(defaults, fileConfig, envConfig, programmaticConfig || {});

  return new ProxyConfig(merged);
}

/**
 * Load configuration from a file (deprecated - use loadConfig instead)
 */
export function loadConfigFromFile(path: string): ProxyConfig {
  try {
    const configFile = readFileSync(resolve(path), 'utf-8');
    const config = JSON.parse(configFile) as ServerConfig;
    return new ProxyConfig(config);
  } catch (error) {
    console.error('Failed to load configuration file:', error);
    throw error;
  }
}

/**
 * Load configuration from environment variables (deprecated - use loadConfig instead)
 */
export function loadConfigFromEnv(): ProxyConfig {
  const config = getConfigFromEnv();
  return new ProxyConfig(config as ServerConfig);
}
