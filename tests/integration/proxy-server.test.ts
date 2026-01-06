import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ProxyServer, createProxy, loadConfig } from '../../src/index';
import { createServer as createHTTP, type Server as HTTPServer } from 'node:http';
import type { ServerConfig } from '../../src/utils/config';

describe('ProxyServer Integration Tests', () => {
  let mockBackendServer: HTTPServer;
  let mockBackendPort: number;

  beforeAll(async () => {
    // Create a mock backend server for testing
    mockBackendPort = 9876;

    mockBackendServer = createHTTP((req, res) => {
      if (req.url === '/test') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Hello from backend', path: req.url }));
      } else if (req.url === '/echo') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ echo: body, headers: req.headers }));
        });
      } else if (req.url === '/status/404') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else if (req.url === '/robiki-proxy/health') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Backend received health check request - this should not happen');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      }
    });

    await new Promise<void>((resolve) => {
      mockBackendServer.listen(mockBackendPort, '127.0.0.1', () => {
        console.log(`Mock backend server listening on port ${mockBackendPort}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      mockBackendServer.close(() => {
        console.log('Mock backend server closed');
        resolve();
      });
    });
  });

  describe('ProxyServer class', () => {
    it('should create a ProxyServer instance', () => {
      const config: ServerConfig = {
        routes: {
          'test.local': {
            target: `127.0.0.1:${mockBackendPort}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      expect(proxy).toBeInstanceOf(ProxyServer);
      expect(proxy.getConfig()).toBeDefined();
    });

    it('should get configuration', () => {
      const config: ServerConfig = {
        routes: {
          'test.local': {
            target: `127.0.0.1:${mockBackendPort}`,
          },
        },
        cors: {
          origin: '*',
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const proxyConfig = proxy.getConfig();

      expect(proxyConfig.getConfig().routes).toBeDefined();
      expect(proxyConfig.getConfig().routes['test.local']).toBeDefined();
      expect(proxyConfig.getConfig().routes['test.local'].target).toBe(`127.0.0.1:${mockBackendPort}`);
    });
  });

  describe('Configuration loading', () => {
    it('should load config with routes', () => {
      const config: Partial<ServerConfig> = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
          'api.example.com': {
            target: 'localhost:4000',
            ssl: true,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const loadedConfig = proxy.getConfig().getConfig();

      expect(loadedConfig.routes['example.com']).toBeDefined();
      expect(loadedConfig.routes['example.com'].target).toBe('localhost:3000');
      expect(loadedConfig.routes['api.example.com']).toBeDefined();
      expect(loadedConfig.routes['api.example.com'].ssl).toBe(true);
    });

    it('should apply default CORS configuration', () => {
      const config: Partial<ServerConfig> = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const loadedConfig = proxy.getConfig().getConfig();

      expect(loadedConfig.cors).toBeDefined();
    });

    it('should merge custom CORS configuration', () => {
      const config: Partial<ServerConfig> = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
        cors: {
          origin: 'https://specific-origin.com',
          methods: ['GET', 'POST'],
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const loadedConfig = proxy.getConfig().getConfig();

      expect(loadedConfig.cors?.origin).toBe('https://specific-origin.com');
      expect(loadedConfig.cors?.methods).toEqual(['GET', 'POST']);
    });
  });

  describe('Route resolution', () => {
    let proxy: ProxyServer;

    beforeEach(() => {
      const config: ServerConfig = {
        routes: {
          'exact.com': {
            target: 'localhost:3000',
          },
          '*.wildcard.com': {
            target: 'localhost:4000',
          },
          'api.service.com': {
            target: 'localhost:5000',
            ssl: true,
          },
        },
      };

      proxy = new ProxyServer(loadConfig(config));
    });

    it('should resolve exact domain match', () => {
      const route = proxy.getConfig().getRoute('exact.com');
      expect(route).toBeDefined();
      expect(route?.target).toBe('localhost:3000');
    });

    it('should resolve wildcard domain match', () => {
      const route = proxy.getConfig().getRoute('test.wildcard.com');
      expect(route).toBeDefined();
      expect(route?.target).toBe('localhost:4000');
    });

    it('should resolve domain with port', () => {
      const route = proxy.getConfig().getRoute('exact.com:8080');
      expect(route).toBeDefined();
      expect(route?.target).toBe('localhost:3000');
    });

    it('should return undefined for non-matching domain', () => {
      const route = proxy.getConfig().getRoute('nonexistent.com');
      expect(route).toBeUndefined();
    });

    it('should get target with SSL configuration', () => {
      const { target, ssl } = proxy.getConfig().getTarget('api.service.com');
      expect(target).toBe('localhost:5000');
      expect(ssl).toBeUndefined(); // SSL config not initialized without actual certs
    });
  });

  describe('URL remapping', () => {
    it('should apply URL remap function', () => {
      const config: ServerConfig = {
        routes: {
          'remap.com': {
            target: 'localhost:3000',
            remap: (url: string) => url.replace('/api/v1', '/api/v2'),
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const route = proxy.getConfig().getRoute('remap.com');

      expect(route?.remap).toBeDefined();
      expect(route?.remap?.('/api/v1/users')).toBe('/api/v2/users');
    });

    it('should handle multiple remap patterns', () => {
      const config: ServerConfig = {
        routes: {
          'remap.com': {
            target: 'localhost:3000',
            remap: (url: string) => {
              return url.replace('/old-api', '/new-api').replace('/v1', '/v2');
            },
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const route = proxy.getConfig().getRoute('remap.com');

      expect(route?.remap?.('/old-api/v1/users')).toBe('/new-api/v2/users');
    });
  });

  describe('Validation', () => {
    it('should validate requests with custom validator', async () => {
      const config: ServerConfig = {
        routes: {
          'validated.com': {
            target: 'localhost:3000',
            validate: async (info) => {
              if (info.headers['authorization']) {
                return { status: true };
              }
              return { status: false, code: 401, message: 'Unauthorized' };
            },
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      const validResult = await proxy.getConfig().validate({
        id: 1,
        method: 'GET',
        path: '/test',
        authority: 'validated.com',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        origin: 'https://validated.com',
        headers: { authorization: 'Bearer token' },
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(validResult.status).toBe(true);

      const invalidResult = await proxy.getConfig().validate({
        id: 2,
        method: 'GET',
        path: '/test',
        authority: 'validated.com',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        origin: 'https://validated.com',
        headers: {},
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(invalidResult.status).toBe(false);
      expect(invalidResult.code).toBe(401);
    });

    it('should use global validator when no route validator', async () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
        validate: async (info) => {
          if (info.method === 'GET') {
            return { status: true };
          }
          return { status: false, code: 405, message: 'Method Not Allowed' };
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      const getResult = await proxy.getConfig().validate({
        id: 1,
        method: 'GET',
        path: '/test',
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

      expect(getResult.status).toBe(true);

      const postResult = await proxy.getConfig().validate({
        id: 2,
        method: 'POST',
        path: '/test',
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

      expect(postResult.status).toBe(false);
      expect(postResult.code).toBe(405);
    });
  });

  describe('CORS handling', () => {
    it('should generate CORS headers for allowed origin', () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
        cors: {
          origin: ['https://allowed.com', 'https://also-allowed.com'],
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const headers = proxy.getConfig().getCorsHeaders('https://allowed.com');

      expect(headers['access-control-allow-origin']).toBe('https://allowed.com');
    });

    it('should not set origin for disallowed origin', () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
          },
        },
        cors: {
          origin: ['https://allowed.com'],
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const headers = proxy.getConfig().getCorsHeaders('https://not-allowed.com');

      expect(headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should use route-specific CORS config', () => {
      const config: ServerConfig = {
        routes: {
          'example.com': {
            target: 'localhost:3000',
            cors: {
              origin: 'https://route-specific.com',
              methods: ['GET', 'POST'],
            },
          },
        },
        cors: {
          origin: '*',
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const headers = proxy.getConfig().getCorsHeaders('https://route-specific.com', 'example.com');

      expect(headers['access-control-allow-origin']).toBe('https://route-specific.com');
      expect(headers['access-control-allow-methods']).toBe('GET, POST');
    });
  });

  describe('Health check endpoint', () => {
    it('should respond to health check requests', async () => {
      const config: ServerConfig = {
        routes: {
          'test.local': {
            target: `127.0.0.1:${mockBackendPort}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      await proxy.start();

      try {
        const response = await new Promise<{ statusCode?: number; data: string }>((resolve, reject) => {
          const req = require('node:http').request(
            {
              hostname: '127.0.0.1',
              port: 8080,
              path: '/robiki-proxy/health',
              method: 'GET',
            },
            (res: any) => {
              let data = '';
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
              });
              res.on('end', () => {
                resolve({ statusCode: res.statusCode, data });
              });
            }
          );
          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).toBe(200);
        expect(response.data).toBe('OK');
      } finally {
        await proxy.stop();
      }
    });

    it('should not proxy health check requests to backend', async () => {
      const config: ServerConfig = {
        routes: {
          'test.local': {
            target: `127.0.0.1:${mockBackendPort}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      await proxy.start();

      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        const response = await new Promise<{ statusCode?: number; data: string }>((resolve, reject) => {
          const req = require('node:http').request(
            {
              hostname: '127.0.0.1',
              port: 8080,
              path: '/robiki-proxy/health',
              method: 'GET',
              headers: {
                Host: 'nonexistent.local',
              },
            },
            (res: any) => {
              let data = '';
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
              });
              res.on('end', () => {
                resolve({ statusCode: res.statusCode, data });
              });
            }
          );
          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).toBe(200);
        expect(response.data).toBe('OK');
      } finally {
        await proxy.stop();
      }
    });

    it('should only respond to GET requests on health endpoint', async () => {
      const config: ServerConfig = {
        routes: {
          'test.local': {
            target: `127.0.0.1:${mockBackendPort}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      await proxy.start();

      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        const response = await new Promise<{ statusCode?: number; data: string }>((resolve, reject) => {
          const req = require('node:http').request(
            {
              hostname: '127.0.0.1',
              port: 8080,
              path: '/robiki-proxy/health',
              method: 'POST',
              headers: {
                Host: 'test.local',
              },
            },
            (res: any) => {
              let data = '';
              res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
              });
              res.on('end', () => {
                resolve({ statusCode: res.statusCode, data });
              });
            }
          );
          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).not.toBe(200);
        expect(response.data).not.toBe('OK');
      } finally {
        await proxy.stop();
      }
    });
  });
});
