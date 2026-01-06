import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProxyServer, loadConfig } from '../../src/index';
import { createServer as createHTTP, type Server as HTTPServer, request as httpRequest } from 'node:http';
import type { ServerConfig } from '../../src/utils/config';

describe('Full Proxy Integration Tests', () => {
  let mockBackend1: HTTPServer;
  let mockBackend2: HTTPServer;
  let mockBackend1Port: number;
  let mockBackend2Port: number;

  beforeAll(async () => {
    mockBackend1Port = 9893;
    mockBackend2Port = 9894;

    // Create first backend server
    mockBackend1 = createHTTP((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Backend': 'backend-1',
      });
      res.end(
        JSON.stringify({
          backend: 'backend-1',
          path: req.url,
          method: req.method,
        })
      );
    });

    // Create second backend server
    mockBackend2 = createHTTP((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Backend': 'backend-2',
      });
      res.end(
        JSON.stringify({
          backend: 'backend-2',
          path: req.url,
          method: req.method,
        })
      );
    });

    await Promise.all([
      new Promise<void>((resolve) => {
        mockBackend1.listen(mockBackend1Port, '127.0.0.1', () => {
          console.log(`Backend 1 listening on port ${mockBackend1Port}`);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        mockBackend2.listen(mockBackend2Port, '127.0.0.1', () => {
          console.log(`Backend 2 listening on port ${mockBackend2Port}`);
          resolve();
        });
      }),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve) => {
        mockBackend1.close(() => {
          console.log('Backend 1 closed');
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        mockBackend2.close(() => {
          console.log('Backend 2 closed');
          resolve();
        });
      }),
    ]);
  });

  describe('Multi-backend routing', () => {
    it('should route to different backends based on host', () => {
      const config: ServerConfig = {
        routes: {
          'service1.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
          },
          'service2.local': {
            target: `127.0.0.1:${mockBackend2Port}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      const route1 = proxy.getConfig().getRoute('service1.local');
      const route2 = proxy.getConfig().getRoute('service2.local');

      expect(route1?.target).toBe(`127.0.0.1:${mockBackend1Port}`);
      expect(route2?.target).toBe(`127.0.0.1:${mockBackend2Port}`);
    });

    it('should handle wildcard routing', () => {
      const config: ServerConfig = {
        routes: {
          '*.api.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
          },
          '*.admin.local': {
            target: `127.0.0.1:${mockBackend2Port}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      const apiRoute = proxy.getConfig().getRoute('v1.api.local');
      const adminRoute = proxy.getConfig().getRoute('panel.admin.local');

      expect(apiRoute?.target).toBe(`127.0.0.1:${mockBackend1Port}`);
      expect(adminRoute?.target).toBe(`127.0.0.1:${mockBackend2Port}`);
    });
  });

  describe('Complex routing scenarios', () => {
    it('should handle route-specific CORS', () => {
      const config: ServerConfig = {
        routes: {
          'public.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
            cors: {
              origin: '*',
              methods: ['GET', 'POST'],
            },
          },
          'restricted.local': {
            target: `127.0.0.1:${mockBackend2Port}`,
            cors: {
              origin: ['https://allowed.com'],
              methods: ['GET'],
              credentials: true,
            },
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      const publicCors = proxy.getConfig().getCorsHeaders('https://any.com', 'public.local');
      expect(publicCors['access-control-allow-origin']).toBe('*');
      expect(publicCors['access-control-allow-methods']).toBe('GET, POST');

      const restrictedCors = proxy.getConfig().getCorsHeaders('https://allowed.com', 'restricted.local');
      expect(restrictedCors['access-control-allow-origin']).toBe('https://allowed.com');
      expect(restrictedCors['access-control-allow-methods']).toBe('GET');
    });

    it('should handle route-specific URL remapping', () => {
      const config: ServerConfig = {
        routes: {
          'old-api.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
            remap: (url: string) => url.replace('/v1/', '/v2/'),
          },
          'new-api.local': {
            target: `127.0.0.1:${mockBackend2Port}`,
            remap: (url: string) => url.replace('/legacy/', '/modern/'),
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      const oldApiRoute = proxy.getConfig().getRoute('old-api.local');
      const newApiRoute = proxy.getConfig().getRoute('new-api.local');

      expect(oldApiRoute?.remap?.('/v1/users')).toBe('/v2/users');
      expect(newApiRoute?.remap?.('/legacy/data')).toBe('/modern/data');
    });

    it('should handle route-specific validation', async () => {
      const config: ServerConfig = {
        routes: {
          'public.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
          },
          'private.local': {
            target: `127.0.0.1:${mockBackend2Port}`,
            validate: async (info) => {
              const apiKey = info.headers['x-api-key'];
              if (apiKey === 'secret-key') {
                return { status: true };
              }
              return { status: false, code: 403, message: 'Forbidden' };
            },
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      // Public route should always pass
      const publicResult = await proxy.getConfig().validate({
        id: 1,
        method: 'GET',
        path: '/test',
        authority: 'public.local',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        origin: 'https://public.local',
        headers: {},
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(publicResult.status).toBe(true);

      // Private route should validate API key
      const privateValidResult = await proxy.getConfig().validate({
        id: 2,
        method: 'GET',
        path: '/test',
        authority: 'private.local',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        origin: 'https://private.local',
        headers: { 'x-api-key': 'secret-key' },
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(privateValidResult.status).toBe(true);

      const privateInvalidResult = await proxy.getConfig().validate({
        id: 3,
        method: 'GET',
        path: '/test',
        authority: 'private.local',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        origin: 'https://private.local',
        headers: {},
        query: new URLSearchParams(),
        type: 0,
        respond: () => {},
        end: () => {},
      } as any);

      expect(privateInvalidResult.status).toBe(false);
      expect(privateInvalidResult.code).toBe(403);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing host header gracefully', () => {
      const config: ServerConfig = {
        routes: {
          'example.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const { target } = proxy.getConfig().getTarget('');

      expect(target).toBeUndefined();
    });

    it('should handle empty routes configuration', () => {
      const config: ServerConfig = {
        routes: {},
      };

      const proxy = new ProxyServer(loadConfig(config));
      const route = proxy.getConfig().getRoute('any.host');

      expect(route).toBeUndefined();
    });

    it('should handle complex wildcard patterns', () => {
      const config: ServerConfig = {
        routes: {
          '*.*.example.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));

      const route1 = proxy.getConfig().getRoute('api.v1.example.local');
      const route2 = proxy.getConfig().getRoute('admin.panel.example.local');
      const route3 = proxy.getConfig().getRoute('simple.example.local');

      expect(route1?.target).toBe(`127.0.0.1:${mockBackend1Port}`);
      expect(route2?.target).toBe(`127.0.0.1:${mockBackend1Port}`);
      // Note: simple.example.local matches *.*.example.local because * can match empty string
      expect(route3?.target).toBe(`127.0.0.1:${mockBackend1Port}`);
    });

    it('should handle URL with query parameters in remap', () => {
      const config: ServerConfig = {
        routes: {
          'example.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
            remap: (url: string) => {
              const [path, query] = url.split('?');
              const newPath = path.replace('/old', '/new');
              return query ? `${newPath}?${query}` : newPath;
            },
          },
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const route = proxy.getConfig().getRoute('example.local');

      expect(route?.remap?.('/old/path?param=value')).toBe('/new/path?param=value');
      expect(route?.remap?.('/old/path')).toBe('/new/path');
    });
  });

  describe('Configuration merging', () => {
    it('should merge global and route-specific configs', () => {
      const config: ServerConfig = {
        routes: {
          'example.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
            cors: {
              methods: ['GET', 'POST'],
            },
          },
        },
        cors: {
          origin: '*',
          credentials: true,
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const headers = proxy.getConfig().getCorsHeaders('https://test.com', 'example.local');

      // Should have route-specific methods
      expect(headers['access-control-allow-methods']).toBe('GET, POST');
      // When route CORS exists but doesn't specify origin, it uses the request origin
      expect(headers['access-control-allow-origin']).toBe('https://test.com');
    });

    it('should prioritize route config over global config', () => {
      const config: ServerConfig = {
        routes: {
          'example.local': {
            target: `127.0.0.1:${mockBackend1Port}`,
            cors: {
              origin: 'https://specific.com',
            },
          },
        },
        cors: {
          origin: '*',
        },
      };

      const proxy = new ProxyServer(loadConfig(config));
      const headers = proxy.getConfig().getCorsHeaders('https://specific.com', 'example.local');

      expect(headers['access-control-allow-origin']).toBe('https://specific.com');
    });
  });
});
