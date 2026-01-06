/**
 * Example TypeScript configuration file for Robiki Proxy
 *
 * This file demonstrates how to use TypeScript for type-safe configuration
 * with full IDE support, autocomplete, and type checking.
 *
 * Benefits of TypeScript config:
 * - Full type safety and autocomplete
 * - Compile-time error checking
 * - Better refactoring support
 * - Access to TypeScript features
 *
 * To use this config with Docker:
 * 1. Mount this file: -v ./proxy.config.ts:/usr/src/proxy.config.ts
 * 2. Set environment: -e PROXY_CONFIG=/usr/src/proxy.config.ts
 *
 * Note: tsx is required for TypeScript support and is included as a dependency.
 */

import type { ServerConfig, ConnectionInfo, ForwardValidationResult } from '@robiki/proxy';

function createRateLimitValidator(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return async (info: ConnectionInfo): Promise<ForwardValidationResult> => {
    const now = Date.now();
    const userRequests = requests.get(info.remoteAddress) || [];

    const recentRequests = userRequests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return {
        status: false,
        code: 429,
        message: 'Too Many Requests',
        headers: {
          'retry-after': Math.ceil(windowMs / 1000).toString(),
        },
      };
    }

    recentRequests.push(now);
    requests.set(info.remoteAddress, recentRequests);

    return { status: true };
  };
}

const config: ServerConfig = {
  ssl: {
    key: process.env.SSL_KEY || './certs/key.pem',
    cert: process.env.SSL_CERT || './certs/cert.pem',
    ca: process.env.SSL_CA || './certs/ca.pem',
    allowHTTP1: true,
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    credentials: true,
    maxAge: 86400,
  },
  validate: async (info: ConnectionInfo): Promise<ForwardValidationResult> => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${info.method} ${info.path} from ${info.remoteAddress}`);
    const blockedIPs: string[] = ['192.168.1.100', '10.0.0.50'];
    if (blockedIPs.includes(info.remoteAddress)) {
      return {
        status: false,
        code: 403,
        message: 'Forbidden',
      };
    }

    if (info.path.startsWith('/admin') && !info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: 'Unauthorized',
        headers: {
          'www-authenticate': 'Bearer',
        },
      };
    }

    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend-service:3000',
      ssl: true,
      cors: {
        origin: ['https://example.com', 'https://www.example.com'],
        credentials: true,
      },
      remap: (url: string): string => {
        if (url.startsWith('/api')) {
          return url.replace(/^\/api/, '');
        }
        return url;
      },
      validate: createRateLimitValidator(100, 60000), // 100 requests per minute
    },
    'example.com': {
      target: 'frontend-service:8080',
      ssl: false,
      // Complex remapping with type safety
      remap: (url: string): string => {
        const rewrites: Record<string, string> = {
          '/old-path': '/new-path',
          '/legacy': '/modern',
          '/v1': '/v2',
        };

        for (const [oldPath, newPath] of Object.entries(rewrites)) {
          if (url.startsWith(oldPath)) {
            return url.replace(oldPath, newPath);
          }
        }

        return url;
      },
    },
    '*.example.com': {
      target: 'wildcard-service:4000',
      ssl: true,
      remap: (url: string): string => {
        if (!url.startsWith('/v1') && !url.startsWith('/v2')) {
          return `/v1${url}`;
        }
        return url;
      },
      validate: async (info: ConnectionInfo): Promise<ForwardValidationResult> => {
        const apiKey = info.headers['x-api-key'];

        if (!apiKey || typeof apiKey !== 'string') {
          return {
            status: false,
            code: 401,
            message: 'API Key Required',
            headers: {
              'www-authenticate': 'ApiKey',
            },
          };
        }

        const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
        if (!validApiKeys.includes(apiKey)) {
          return {
            status: false,
            code: 403,
            message: 'Invalid API Key',
          };
        }

        return { status: true };
      },
    },
    'api.example.com:8080': {
      target: 'backend-service:8080',
      ssl: false,
      remap: (url: string): string => {
        if (!url.startsWith('/v1') && !url.startsWith('/v2')) {
          return `/v1${url}`;
        }
        return url;
      },
    },
  },
};

export default config;
