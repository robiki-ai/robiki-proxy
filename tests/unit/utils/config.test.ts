import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProxyConfig, loadConfig } from '../../../src/utils/config';
import type { ServerConfig, RouteConfig } from '../../../src/utils/config';

describe('ProxyConfig', () => {
  describe('constructor and initialization', () => {
    it('should create a ProxyConfig instance with valid config', () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
      };

      const proxyConfig = new ProxyConfig(config);
      expect(proxyConfig).toBeInstanceOf(ProxyConfig);
    });

    it('should handle config without SSL', () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
      };

      const proxyConfig = new ProxyConfig(config);
      expect(proxyConfig.getSSL()).toBeUndefined();
    });
  });

  describe('getRoute', () => {
    let proxyConfig: ProxyConfig;

    beforeEach(() => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
          'api.example.com': {
            target: 'localhost:4000',
            ssl: true,
          },
          '*.wildcard.com': {
            target: 'localhost:5000',
          },
        },
      };
      proxyConfig = new ProxyConfig(config);
    });

    it('should return route for exact host match', () => {
      const route = proxyConfig.getRoute('example.com');
      expect(route).toBeDefined();
      expect(route?.target).toBe('localhost:3000');
    });

    it('should return route for host with port', () => {
      const route = proxyConfig.getRoute('example.com:8080');
      expect(route).toBeDefined();
      expect(route?.target).toBe('localhost:3000');
    });

    it('should return route for wildcard match', () => {
      const route = proxyConfig.getRoute('test.wildcard.com');
      expect(route).toBeDefined();
      expect(route?.target).toBe('localhost:5000');
    });

    it('should return undefined for non-matching host', () => {
      const route = proxyConfig.getRoute('nonexistent.com');
      expect(route).toBeUndefined();
    });
  });

  describe('getTarget', () => {
    let proxyConfig: ProxyConfig;

    beforeEach(() => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
            remap: (url: string) => url.replace('/api', '/v1'),
          },
        },
      };
      proxyConfig = new ProxyConfig(config);
    });

    it('should return target configuration', () => {
      const { target, remap } = proxyConfig.getTarget('example.com');
      expect(target).toBe('localhost:3000');
      expect(remap).toBeDefined();
      expect(remap?.('/api/test')).toBe('/v1/test');
    });

    it('should return undefined for non-matching host', () => {
      const { target } = proxyConfig.getTarget('nonexistent.com');
      expect(target).toBeUndefined();
    });
  });

  describe('getCorsHeaders', () => {
    it('should return default CORS headers when no config', () => {
      const config: ServerConfig = {
        routes: {},
      };
      const proxyConfig = new ProxyConfig(config);
      const headers = proxyConfig.getCorsHeaders('https://example.com');

      expect(headers['access-control-allow-origin']).toBe('https://example.com');
      expect(headers['access-control-allow-methods']).toBe('*');
      expect(headers['access-control-allow-headers']).toBe('*');
      expect(headers['access-control-allow-credentials']).toBe('true');
    });

    it('should return wildcard CORS when configured', () => {
      const config: ServerConfig = {
        routes: {},
        cors: {
          origin: '*',
        },
      };
      const proxyConfig = new ProxyConfig(config);
      const headers = proxyConfig.getCorsHeaders('https://example.com');

      expect(headers['access-control-allow-origin']).toBe('*');
    });

    it('should validate origin against allowed list', () => {
      const config: ServerConfig = {
        routes: {},
        cors: {
          origin: ['https://allowed.com', 'https://also-allowed.com'],
        },
      };
      const proxyConfig = new ProxyConfig(config);

      const allowedHeaders = proxyConfig.getCorsHeaders('https://allowed.com');
      expect(allowedHeaders['access-control-allow-origin']).toBe('https://allowed.com');

      const notAllowedHeaders = proxyConfig.getCorsHeaders('https://not-allowed.com');
      expect(notAllowedHeaders['access-control-allow-origin']).toBeUndefined();
    });

    it('should apply custom CORS methods and headers', () => {
      const config: ServerConfig = {
        routes: {},
        cors: {
          methods: ['GET', 'POST'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: false,
        },
      };
      const proxyConfig = new ProxyConfig(config);
      const headers = proxyConfig.getCorsHeaders('https://example.com');

      expect(headers['access-control-allow-methods']).toBe('GET, POST');
      expect(headers['access-control-allow-headers']).toBe('Content-Type, Authorization');
      expect(headers['access-control-allow-credentials']).toBe('false');
    });
  });

  describe('validate', () => {
    it('should return success when no validation configured', async () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
      };
      const proxyConfig = new ProxyConfig(config);

      const result = await proxyConfig.validate({
        id: 1,
        method: 'GET',
        path: '/',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        authority: 'example.com',
        origin: 'https://example.com',
        headers: {},
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(result.status).toBe(true);
    });

    it('should use route-specific validation', async () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
            validate: async (info) => ({
              status: info.path === '/allowed',
              code: info.path === '/allowed' ? 200 : 403,
              message: info.path === '/allowed' ? 'OK' : 'Forbidden',
            }),
          },
        },
      };
      const proxyConfig = new ProxyConfig(config);

      const allowedResult = await proxyConfig.validate({
        id: 1,
        method: 'GET',
        path: '/allowed',
        authority: 'example.com',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        origin: 'https://example.com',
        headers: {},
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(allowedResult.status).toBe(true);
      expect(allowedResult.code).toBe(200);

      const forbiddenResult = await proxyConfig.validate({
        id: 2,
        method: 'GET',
        path: '/forbidden',
        authority: 'example.com',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        origin: 'https://example.com',
        headers: {},
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(forbiddenResult.status).toBe(false);
      expect(forbiddenResult.code).toBe(403);
    });
  });

  describe('getPorts', () => {
    it('should return default ports', () => {
      const config: ServerConfig = {
        routes: {},
      };
      const proxyConfig = new ProxyConfig(config);
      const ports = proxyConfig.getPorts();

      expect(ports).toEqual([443, 8080, 9229]);
    });
  });

  describe('loadConfig', () => {
    it('should load config with defaults', async () => {
      const proxyConfig = await loadConfig({
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
      });

      expect(proxyConfig).toBeInstanceOf(ProxyConfig);
      expect(proxyConfig.getConfig().cors).toBeDefined();
      expect(proxyConfig.getConfig().cors?.origin).toBe('*');
    });

    it('should merge programmatic config with defaults', async () => {
      const proxyConfig = await loadConfig({
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
        cors: {
          origin: 'https://specific.com',
        },
      });

      const config = proxyConfig.getConfig();
      expect(config.cors?.origin).toBe('https://specific.com');
      expect(config.cors?.credentials).toBe(true); // from defaults
    });
  });
});
