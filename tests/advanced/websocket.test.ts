import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer as createHTTP, type Server as HTTPServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { websocket } from '../../src/utils/server';
import { websocketAPIProxyHandler } from '../../src/connections/websocket';
import { loadConfig, type ProxyConfig } from '../../src/utils/config';
import type { ServerConfig } from '../../src/utils/config';

describe('WebSocket Advanced Tests', () => {
  let mockBackendServer: HTTPServer;
  let mockBackendWss: WebSocketServer;
  let mockBackendPort: number;
  let proxyConfig: ProxyConfig;
  const receivedMessages: string[] = [];

  beforeAll(async () => {
    mockBackendPort = 9884;

    mockBackendServer = createHTTP((req, res) => {
      res.writeHead(200);
      res.end('OK');
    });

    mockBackendWss = new WebSocketServer({ server: mockBackendServer });

    mockBackendWss.on('connection', (ws, req) => {
      console.log('Backend WebSocket connection established');

      ws.on('message', (message) => {
        const msg = message.toString();
        receivedMessages.push(msg);

        if (msg.startsWith('{')) {
          const data = JSON.parse(msg);
          ws.send(JSON.stringify({ echo: data, timestamp: Date.now() }));
        } else {
          ws.send(`Echo: ${msg}`);
        }
      });

      ws.on('close', () => {
        console.log('Backend WebSocket connection closed');
      });

      ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to backend' }));
    });

    await new Promise<void>((resolve) => {
      mockBackendServer.listen(mockBackendPort, '127.0.0.1', () => {
        console.log(`Mock backend WebSocket server listening on port ${mockBackendPort}`);
        resolve();
      });
    });

    const config: ServerConfig = {
      routes: {
        'ws.test.local': {
          target: `127.0.0.1:${mockBackendPort}`,
        },
        'ws.validated.local': {
          target: `127.0.0.1:${mockBackendPort}`,
          validate: async (info) => {
            const token = info.headers['authorization'];
            if (token === 'Bearer valid-token') {
              return { status: true };
            }
            return { status: false, code: 401, message: 'Unauthorized' };
          },
        },
      },
    };

    proxyConfig = loadConfig(config);
  });

  afterAll(async () => {
    mockBackendWss.clients.forEach((client) => {
      client.terminate();
    });

    await new Promise<void>((resolve) => {
      mockBackendWss.close(() => {
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      mockBackendServer.close(() => {
        console.log('Mock backend WebSocket server closed');
        resolve();
      });
    });
  }, 15000);

  describe('WebSocket connection', () => {
    it('should establish WebSocket connection through proxy', async () => {
      const proxyServer = createHTTP((req, res) => {
        res.writeHead(200);
        res.end('OK');
      });
      const proxyPort = 9885;

      websocket(proxyServer, (req, socket, headers) => websocketAPIProxyHandler(req, socket, headers, proxyConfig));

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}/test`, {
          headers: {
            Host: 'ws.test.local',
          },
        });

        const welcomeMessage = await new Promise<any>((resolve, reject) => {
          ws.on('open', () => {
            console.log('Client WebSocket connection opened');
          });

          ws.on('message', (data) => {
            const message = data.toString();
            if (message.startsWith('{')) {
              resolve(JSON.parse(message));
            }
          });

          ws.on('error', reject);

          setTimeout(() => reject(new Error('Timeout waiting for welcome message')), 5000);
        });

        expect(welcomeMessage.type).toBe('welcome');
        expect(welcomeMessage.message).toBe('Connected to backend');

        ws.close();
        await new Promise<void>((resolve) => {
          ws.on('close', () => resolve());
        });
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    }, 10000);

    it('should proxy text messages bidirectionally', async () => {
      const proxyServer = createHTTP((req, res) => {
        res.writeHead(200);
        res.end('OK');
      });
      const proxyPort = 9886;

      websocket(proxyServer, (req, socket, headers) => websocketAPIProxyHandler(req, socket, headers, proxyConfig));

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}/test`, {
          headers: {
            Host: 'ws.test.local',
          },
        });

        await new Promise<void>((resolve, reject) => {
          ws.on('open', resolve);
          ws.on('error', reject);
          setTimeout(() => reject(new Error('Timeout waiting for connection')), 5000);
        });

        // Wait for welcome message
        await new Promise<void>((resolve) => {
          ws.once('message', () => resolve());
        });

        const testMessage = 'Hello from client';
        ws.send(testMessage);

        const response = await new Promise<string>((resolve, reject) => {
          ws.on('message', (data) => {
            resolve(data.toString());
          });
          setTimeout(() => reject(new Error('Timeout waiting for response')), 5000);
        });

        expect(response).toBe(`Echo: ${testMessage}`);

        ws.close();
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    }, 10000);

    it('should proxy JSON messages bidirectionally', async () => {
      const proxyServer = createHTTP((req, res) => {
        res.writeHead(200);
        res.end('OK');
      });
      const proxyPort = 9887;

      websocket(proxyServer, (req, socket, headers) => websocketAPIProxyHandler(req, socket, headers, proxyConfig));

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}/test`, {
          headers: {
            Host: 'ws.test.local',
          },
        });

        await new Promise<void>((resolve, reject) => {
          ws.on('open', resolve);
          ws.on('error', reject);
          setTimeout(() => reject(new Error('Timeout waiting for connection')), 5000);
        });

        await new Promise<void>((resolve) => {
          ws.once('message', () => resolve());
        });

        const testData = { type: 'test', value: 123, message: 'Hello' };
        ws.send(JSON.stringify(testData));

        const response = await new Promise<any>((resolve, reject) => {
          ws.on('message', (data) => {
            const message = data.toString();
            if (message.startsWith('{')) {
              const parsed = JSON.parse(message);
              if (parsed.echo) {
                resolve(parsed);
              }
            }
          });
          setTimeout(() => reject(new Error('Timeout waiting for response')), 5000);
        });

        expect(response.echo).toEqual(testData);
        expect(response.timestamp).toBeDefined();

        ws.close();
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    }, 10000);

    it.skip('should handle multiple concurrent connections', async () => {
      const proxyServer = createHTTP((req, res) => {
        res.writeHead(200);
        res.end('OK');
      });
      const proxyPort = 9888;

      websocket(proxyServer, (req, socket, headers) => websocketAPIProxyHandler(req, socket, headers, proxyConfig));

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const connections = 3;
        const clients: WebSocket[] = [];

        for (let i = 0; i < connections; i++) {
          const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}/test`, {
            headers: {
              Host: 'ws.test.local',
            },
          });

          await new Promise<void>((resolve, reject) => {
            ws.on('open', resolve);
            ws.on('error', reject);
            setTimeout(() => reject(new Error(`Timeout opening connection ${i}`)), 3000);
          });

          clients.push(ws);
        }

        // Wait for and consume welcome messages
        await Promise.all(
          clients.map(
            (ws, i) =>
              new Promise<void>((resolve, reject) => {
                ws.once('message', () => resolve());
                setTimeout(() => reject(new Error(`No welcome message for client ${i}`)), 3000);
              })
          )
        );

        for (let i = 0; i < clients.length; i++) {
          const ws = clients[i];
          const testMessage = `Message from client ${i}`;

          const responsePromise = new Promise<string>((resolve, reject) => {
            ws.once('message', (data) => {
              resolve(data.toString());
            });
            setTimeout(() => reject(new Error(`No response for client ${i}`)), 3000);
          });

          ws.send(testMessage);
          const response = await responsePromise;

          expect(response).toContain(testMessage);
        }

        await Promise.all(
          clients.map(
            (ws) =>
              new Promise<void>((resolve) => {
                ws.on('close', () => resolve());
                ws.close();
              })
          )
        );
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    }, 15000);

    it('should handle connection close gracefully', async () => {
      const proxyServer = createHTTP((req, res) => {
        res.writeHead(200);
        res.end('OK');
      });
      const proxyPort = 9889;

      websocket(proxyServer, (req, socket, headers) => websocketAPIProxyHandler(req, socket, headers, proxyConfig));

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}/test`, {
          headers: {
            Host: 'ws.test.local',
          },
        });

        await new Promise<void>((resolve, reject) => {
          ws.on('open', resolve);
          ws.on('error', reject);
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        const closePromise = new Promise<void>((resolve) => {
          ws.on('close', () => {
            console.log('Client WebSocket closed');
            resolve();
          });
        });

        ws.close();
        await closePromise;

        expect(ws.readyState).toBe(WebSocket.CLOSED);
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    }, 10000);
  });

  describe('WebSocket validation', () => {
    it('should allow connection with valid token', async () => {
      const proxyServer = createHTTP((req, res) => {
        res.writeHead(200);
        res.end('OK');
      });
      const proxyPort = 9890;

      websocket(
        proxyServer,
        (req, socket, headers) => websocketAPIProxyHandler(req, socket, headers, proxyConfig),
        async (info) => {
          const token = info.headers['authorization'];
          if (token === 'Bearer valid-token') {
            return { status: true };
          }
          return { status: false, code: 401, message: 'Unauthorized' };
        }
      );

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}/test`, {
          headers: {
            Host: 'ws.validated.local',
            Authorization: 'Bearer valid-token',
          },
        });

        await new Promise<void>((resolve, reject) => {
          ws.on('open', () => {
            console.log('Connection opened with valid token');
            resolve();
          });
          ws.on('error', reject);
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        ws.close();
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    }, 10000);

    it('should reject connection with invalid token', async () => {
      const proxyServer = createHTTP((req, res) => {
        res.writeHead(200);
        res.end('OK');
      });
      const proxyPort = 9891;

      websocket(
        proxyServer,
        (req, socket, headers) => websocketAPIProxyHandler(req, socket, headers, proxyConfig),
        async (info) => {
          const token = info.headers['authorization'];
          if (token === 'Bearer valid-token') {
            return { status: true };
          }
          return { status: false, code: 401, message: 'Unauthorized' };
        }
      );

      await new Promise<void>((resolve) => {
        proxyServer.listen(proxyPort, '127.0.0.1', resolve);
      });

      try {
        const ws = new WebSocket(`ws://127.0.0.1:${proxyPort}/test`, {
          headers: {
            Host: 'ws.validated.local',
            Authorization: 'Bearer invalid-token',
          },
        });

        const errorOccurred = await new Promise<boolean>((resolve) => {
          ws.on('open', () => {
            console.log('Connection opened unexpectedly');
            resolve(false);
          });
          ws.on('error', (error) => {
            console.log('Connection rejected as expected:', error.message);
            resolve(true);
          });
          setTimeout(() => resolve(false), 5000);
        });

        expect(errorOccurred).toBe(true);
      } finally {
        await new Promise<void>((resolve) => {
          proxyServer.close(() => resolve());
        });
      }
    }, 10000);
  });
});
