import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer as createHTTP, type Server as HTTPServer, request as httpRequest } from 'node:http';
import { restAPIProxyHandler } from '../../src/connections/rest';
import { initConfig } from '../../src/utils/config';
import type { ServerConfig } from '../../src/utils/config';

describe('HTTP Proxy Handler Integration Tests', () => {
  let mockBackendServer: HTTPServer;
  let mockBackendPort: number;

  beforeAll(async () => {
    // Create a mock backend server
    mockBackendPort = 9877;
    
    mockBackendServer = createHTTP((req, res) => {
      if (req.url === '/api/test') {
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'X-Custom-Header': 'backend-value'
        });
        res.end(JSON.stringify({ 
          message: 'Success from backend',
          method: req.method,
          url: req.url,
          headers: req.headers
        }));
      } else if (req.url === '/api/echo') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            echo: body,
            method: req.method,
            headers: req.headers 
          }));
        });
      } else if (req.url === '/api/redirect') {
        res.writeHead(302, { 'Location': '/api/test' });
        res.end();
      } else if (req.url === '/api/error') {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    await new Promise<void>((resolve) => {
      mockBackendServer.listen(mockBackendPort, '127.0.0.1', () => {
        console.log(`Mock backend server for HTTP tests listening on port ${mockBackendPort}`);
        resolve();
      });
    });

    // Initialize config for the proxy
    const config: ServerConfig = {
      routes: {
        'test.local': {
          target: `127.0.0.1:${mockBackendPort}`,
        },
        'remap.local': {
          target: `127.0.0.1:${mockBackendPort}`,
          remap: (url: string) => url.replace('/old', '/api'),
        },
      },
      cors: {
        origin: '*',
      },
    };

    initConfig(config);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      mockBackendServer.close(() => {
        console.log('Mock backend server for HTTP tests closed');
        resolve();
      });
    });
  });

  describe('Basic HTTP proxying', () => {
    it('should proxy GET requests', async () => {
      const proxyServer = createHTTP(restAPIProxyHandler);
      const proxyPort = 9878;

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const response = await new Promise<any>((resolve, reject) => {
          const req = httpRequest({
            hostname: '127.0.0.1',
            port: proxyPort,
            path: '/api/test',
            method: 'GET',
            headers: {
              'Host': 'test.local',
            },
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });
            res.on('end', () => {
              resolve({ statusCode: res.statusCode, data, headers: res.headers });
            });
          });

          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.data);
        expect(body.message).toBe('Success from backend');
        expect(body.method).toBe('GET');
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    });

    it('should proxy POST requests with body', async () => {
      const proxyServer = createHTTP(restAPIProxyHandler);
      const proxyPort = 9879;

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const postData = JSON.stringify({ test: 'data', value: 123 });

        const response = await new Promise<any>((resolve, reject) => {
          const req = httpRequest({
            hostname: '127.0.0.1',
            port: proxyPort,
            path: '/api/echo',
            method: 'POST',
            headers: {
              'Host': 'test.local',
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
            },
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });
            res.on('end', () => {
              resolve({ statusCode: res.statusCode, data });
            });
          });

          req.on('error', reject);
          req.write(postData);
          req.end();
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.data);
        expect(body.echo).toBe(postData);
        expect(body.method).toBe('POST');
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    });

    it('should handle 404 responses', async () => {
      const proxyServer = createHTTP(restAPIProxyHandler);
      const proxyPort = 9880;

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const response = await new Promise<any>((resolve, reject) => {
          const req = httpRequest({
            hostname: '127.0.0.1',
            port: proxyPort,
            path: '/nonexistent',
            method: 'GET',
            headers: {
              'Host': 'test.local',
            },
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });
            res.on('end', () => {
              resolve({ statusCode: res.statusCode, data });
            });
          });

          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).toBe(404);
        expect(response.data).toBe('Not Found');
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    });

    it('should handle 500 errors', async () => {
      const proxyServer = createHTTP(restAPIProxyHandler);
      const proxyPort = 9881;

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const response = await new Promise<any>((resolve, reject) => {
          const req = httpRequest({
            hostname: '127.0.0.1',
            port: proxyPort,
            path: '/api/error',
            method: 'GET',
            headers: {
              'Host': 'test.local',
            },
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });
            res.on('end', () => {
              resolve({ statusCode: res.statusCode, data });
            });
          });

          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).toBe(500);
        expect(response.data).toBe('Internal Server Error');
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    });
  });

  describe('URL remapping', () => {
    it('should apply URL remap before proxying', async () => {
      const proxyServer = createHTTP(restAPIProxyHandler);
      const proxyPort = 9882;

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const response = await new Promise<any>((resolve, reject) => {
          const req = httpRequest({
            hostname: '127.0.0.1',
            port: proxyPort,
            path: '/old/test',
            method: 'GET',
            headers: {
              'Host': 'remap.local',
            },
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });
            res.on('end', () => {
              resolve({ statusCode: res.statusCode, data });
            });
          });

          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.data);
        // The URL should have been remapped from /old/test to /api/test
        expect(body.url).toBe('/api/test');
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    });
  });

  describe('Header forwarding', () => {
    it('should forward custom headers', async () => {
      const proxyServer = createHTTP(restAPIProxyHandler);
      const proxyPort = 9883;

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const response = await new Promise<any>((resolve, reject) => {
          const req = httpRequest({
            hostname: '127.0.0.1',
            port: proxyPort,
            path: '/api/test',
            method: 'GET',
            headers: {
              'Host': 'test.local',
              'X-Custom-Header': 'test-value',
              'Authorization': 'Bearer token123',
            },
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });
            res.on('end', () => {
              resolve({ statusCode: res.statusCode, data, headers: res.headers });
            });
          });

          req.on('error', reject);
          req.end();
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.data);
        expect(body.headers['x-custom-header']).toBe('test-value');
        expect(body.headers['authorization']).toBe('Bearer token123');
        
        // Check that backend's custom header is forwarded back
        expect(response.headers['x-custom-header']).toBe('backend-value');
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    });
  });
});

