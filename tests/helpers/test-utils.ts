/**
 * Test utilities and helper functions
 */

import { createServer as createHTTP, type Server as HTTPServer } from 'node:http';
import { WebSocketServer } from 'ws';
import type { ServerConfig } from '../../src/utils/config';

/**
 * Find an available port for testing
 */
export async function findAvailablePort(startPort: number = 9000): Promise<number> {
  const net = await import('node:net');

  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Create a mock backend server for testing
 */
export async function createMockBackend(port: number): Promise<HTTPServer> {
  const server = createHTTP((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } else if (req.url === '/echo') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ echo: body, headers: req.headers }));
      });
    } else if (req.url?.startsWith('/status/')) {
      const status = parseInt(req.url.split('/')[2]);
      res.writeHead(status, { 'Content-Type': 'text/plain' });
      res.end(`Status ${status}`);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          path: req.url,
          method: req.method,
          headers: req.headers,
        })
      );
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Mock backend listening on port ${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

/**
 * Create a mock WebSocket backend server for testing
 */
export async function createMockWebSocketBackend(port: number): Promise<{
  server: HTTPServer;
  wss: WebSocketServer;
}> {
  const server = createHTTP((req, res) => {
    res.writeHead(200);
    res.end('WebSocket Server');
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      // Echo back the message
      ws.send(message);
    });

    ws.send(JSON.stringify({ type: 'connected' }));
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Mock WebSocket backend listening on port ${port}`);
      resolve({ server, wss });
    });
    server.on('error', reject);
  });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a basic test configuration
 */
export function createTestConfig(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    routes: {},
    cors: {
      origin: '*',
      credentials: true,
    },
    ...overrides,
  };
}

/**
 * Generate random port in test range
 */
export function getRandomTestPort(): number {
  return 9000 + Math.floor(Math.random() * 5000);
}

/**
 * Clean up server resources
 */
export async function cleanupServer(server: HTTPServer): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('Server cleaned up');
      resolve();
    });
  });
}

/**
 * Create a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(fn: () => Promise<T>, maxRetries: number = 3, delayMs: number = 1000): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await delay(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError!;
}

/**
 * Create a mock request object
 */
export function createMockRequest(overrides?: any) {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    httpVersion: '1.1',
    on: () => {},
    ...overrides,
  };
}

/**
 * Create a mock response object
 */
export function createMockResponse() {
  const response: any = {
    statusCode: 200,
    headers: {},
    body: '',
    writeHead: function (status: number, headers?: any) {
      this.statusCode = status;
      if (headers) {
        this.headers = { ...this.headers, ...headers };
      }
    },
    write: function (chunk: any) {
      this.body += chunk.toString();
    },
    end: function (data?: any) {
      if (data) {
        this.body += data.toString();
      }
      this.finished = true;
    },
    on: () => {},
  };

  return response;
}

/**
 * Assert that a value is defined (TypeScript type guard)
 */
export function assertDefined<T>(value: T | undefined | null, message?: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message || 'Value is undefined or null');
  }
}

/**
 * Create a test timeout promise
 */
export function createTimeout(ms: number, message?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message || `Timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message?: string): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs, message)]);
}
