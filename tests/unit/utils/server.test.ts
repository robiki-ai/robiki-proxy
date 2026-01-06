import { describe, it, expect } from 'vitest';
import {
  getCorsHeaders,
  http1ToHttp2Headers,
  http2HeadersToHttp1Headers,
  isPortTaken,
} from '../../../src/utils/server';
import type { IncomingHttpHeaders } from 'node:http2';

describe('Server Utils', () => {
  describe('getCorsHeaders', () => {
    it('should return CORS headers with given origin', () => {
      const origin = 'https://example.com';
      const headers = getCorsHeaders(origin);

      expect(headers['access-control-allow-origin']).toBe(origin);
      expect(headers['access-control-allow-methods']).toBe('*');
      expect(headers['access-control-allow-headers']).toBe('*');
      expect(headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle different origins', () => {
      const origins = [
        'http://localhost:3000',
        'https://api.example.com',
        'https://subdomain.example.org',
      ];

      origins.forEach((origin) => {
        const headers = getCorsHeaders(origin);
        expect(headers['access-control-allow-origin']).toBe(origin);
      });
    });
  });

  describe('http1ToHttp2Headers', () => {
    it('should convert host to :authority', () => {
      const http1Headers: IncomingHttpHeaders = {
        host: 'example.com',
        'content-type': 'application/json',
      };

      const http2Headers = http1ToHttp2Headers(http1Headers);

      expect(http2Headers[':authority']).toBe('example.com');
      expect(http2Headers['host']).toBeUndefined();
      expect(http2Headers['content-type']).toBe('application/json');
    });

    it('should remove HTTP/1.1 specific headers', () => {
      const http1Headers: IncomingHttpHeaders = {
        host: 'example.com',
        connection: 'keep-alive',
        upgrade: 'websocket',
        'transfer-encoding': 'chunked',
        'keep-alive': 'timeout=5',
      };

      const http2Headers = http1ToHttp2Headers(http1Headers);

      expect(http2Headers['connection']).toBeUndefined();
      expect(http2Headers['upgrade']).toBeUndefined();
      expect(http2Headers['transfer-encoding']).toBeUndefined();
      expect(http2Headers['keep-alive']).toBeUndefined();
    });

    it('should remove WebSocket specific headers', () => {
      const http1Headers: IncomingHttpHeaders = {
        host: 'example.com',
        'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'sec-websocket-version': '13',
        'sec-websocket-protocol': 'chat',
        'sec-websocket-extensions': 'permessage-deflate',
      };

      const http2Headers = http1ToHttp2Headers(http1Headers);

      expect(http2Headers['sec-websocket-key']).toBeUndefined();
      expect(http2Headers['sec-websocket-version']).toBeUndefined();
      expect(http2Headers['sec-websocket-protocol']).toBeUndefined();
      expect(http2Headers['sec-websocket-extensions']).toBeUndefined();
    });

    it('should preserve other headers', () => {
      const http1Headers: IncomingHttpHeaders = {
        host: 'example.com',
        'content-type': 'application/json',
        authorization: 'Bearer token123',
        'user-agent': 'TestClient/1.0',
        accept: 'application/json',
      };

      const http2Headers = http1ToHttp2Headers(http1Headers);

      expect(http2Headers['content-type']).toBe('application/json');
      expect(http2Headers['authorization']).toBe('Bearer token123');
      expect(http2Headers['user-agent']).toBe('TestClient/1.0');
      expect(http2Headers['accept']).toBe('application/json');
    });
  });

  describe('http2HeadersToHttp1Headers', () => {
    it('should convert :authority to host', () => {
      const http2Headers: IncomingHttpHeaders = {
        ':authority': 'example.com',
        ':method': 'GET',
        ':path': '/api/test',
        ':scheme': 'https',
        'content-type': 'application/json',
      };

      const http1Headers = http2HeadersToHttp1Headers(http2Headers);

      expect(http1Headers['host']).toBe('example.com');
      expect(http1Headers[':authority']).toBeUndefined();
      expect(http1Headers['content-type']).toBe('application/json');
    });

    it('should remove HTTP/2 pseudo-headers', () => {
      const http2Headers: IncomingHttpHeaders = {
        ':authority': 'example.com',
        ':method': 'POST',
        ':path': '/api/data',
        ':scheme': 'https',
        ':status': '200',
      };

      const http1Headers = http2HeadersToHttp1Headers(http2Headers);

      expect(http1Headers[':method']).toBeUndefined();
      expect(http1Headers[':path']).toBeUndefined();
      expect(http1Headers[':scheme']).toBeUndefined();
      expect(http1Headers[':status']).toBeUndefined();
    });

    it('should handle headers with colons', () => {
      const http2Headers: IncomingHttpHeaders = {
        ':authority': 'example.com',
        ':custom-header': 'value',
      };

      const http1Headers = http2HeadersToHttp1Headers(http2Headers);

      expect(http1Headers['custom-header']).toBe('value');
    });

    it('should preserve standard headers', () => {
      const http2Headers: IncomingHttpHeaders = {
        ':authority': 'example.com',
        'content-type': 'application/json',
        authorization: 'Bearer token123',
        'cache-control': 'no-cache',
      };

      const http1Headers = http2HeadersToHttp1Headers(http2Headers);

      expect(http1Headers['content-type']).toBe('application/json');
      expect(http1Headers['authorization']).toBe('Bearer token123');
      expect(http1Headers['cache-control']).toBe('no-cache');
    });
  });

  describe('isPortTaken', () => {
    it('should return false for available port', async () => {
      // Using a high port number that's likely available
      const port = 50000 + Math.floor(Math.random() * 10000);
      const taken = await isPortTaken(port);
      expect(taken).toBe(false);
    });

    it('should handle port checking without errors', async () => {
      const port = 60000 + Math.floor(Math.random() * 5000);
      await expect(isPortTaken(port)).resolves.toBeDefined();
    });
  });
});

