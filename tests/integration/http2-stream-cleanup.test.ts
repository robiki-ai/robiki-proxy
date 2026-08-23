/*
 * Regression: HTTP/2 upstream response streams and sessions must be destroyed
 * when the client goes away. close() is not enough — Node will keep the
 * ClientHttp2Stream alive until pending data is read, which OOMs the proxy
 * under streaming responses (SSE, LLM tokens, large downloads).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, createSecureServer, type ClientHttp2Session, type Http2SecureServer } from 'node:http2';
import { streamAPIProxyHandler } from '../../src/connections/stream';
import { loadConfig, type ProxyConfig } from '../../src/utils/config';
import { createSelfSignedTls, waitFor, withTimeout } from '../helpers/test-utils';

function listen(server: Http2SecureServer): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') resolve(addr.port);
      else reject(new Error('server has no port'));
    });
    server.once('error', reject);
  });
}

function closeServer(server: Http2SecureServer): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe('HTTP/2 response-stream cleanup', () => {
  let tls: Awaited<ReturnType<typeof createSelfSignedTls>>;
  let proxyConfig: ProxyConfig;
  let backend: Http2SecureServer;
  let proxy: Http2SecureServer;
  let backendPort: number;
  let proxyPort: number;
  let openBackendSessions = 0;
  let closedBackendStreams = 0;

  beforeAll(async () => {
    tls = await createSelfSignedTls();

    backend = createSecureServer({ key: tls.key, cert: tls.cert, allowHTTP1: false });
    backend.on('session', (session) => {
      openBackendSessions++;
      session.on('close', () => {
        openBackendSessions--;
      });
    });
    backend.on('stream', (stream, headers) => {
      const path = headers[':path'] as string;

      if (path === '/echo') {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk as Buffer));
        stream.on('end', () => {
          stream.respond({ ':status': 200, 'content-type': 'application/json' });
          stream.end(JSON.stringify({ echo: Buffer.concat(chunks).toString() }));
        });
        return;
      }

      /* Long-lived response: the leak case when clients abort. */
      stream.respond({ ':status': 200, 'content-type': 'application/octet-stream' });
      stream.write('x');
      const timer = setInterval(() => {
        if (stream.destroyed || stream.closed) {
          clearInterval(timer);
          return;
        }
        stream.write('x');
      }, 25);
      stream.on('close', () => {
        closedBackendStreams++;
        clearInterval(timer);
      });
      stream.on('error', () => clearInterval(timer));
    });

    backendPort = await listen(backend);

    proxyConfig = await loadConfig({
      ssl: { key: tls.key.toString(), cert: tls.cert.toString(), allowHTTP1: false },
      routes: {
        localhost: { target: `127.0.0.1:${backendPort}`, ssl: true },
      },
    });

    proxy = createSecureServer({ key: tls.key, cert: tls.cert, allowHTTP1: false });
    proxy.on('stream', (stream, headers) => {
      void streamAPIProxyHandler(stream, headers, proxyConfig);
    });
    proxyPort = await listen(proxy);
  });

  afterAll(async () => {
    await closeServer(proxy);
    await closeServer(backend);
    await tls?.cleanup();
  });

  function openClient(): ClientHttp2Session {
    const client = connect(`https://127.0.0.1:${proxyPort}`, {
      rejectUnauthorized: false,
    });
    client.on('error', () => {});
    return client;
  }

  async function firstChunk(req: { once: (event: string, listener: () => void) => void }): Promise<void> {
    await withTimeout(
      new Promise<void>((resolve) => {
        req.once('data', () => resolve());
        req.once('error', () => resolve());
      }),
      2000,
      'stream produced no data'
    );
  }

  it('forwards a request body and response over HTTP/2', async () => {
    const client = openClient();
    try {
      const req = client.request({
        ':method': 'POST',
        ':path': '/echo',
        ':scheme': 'https',
        ':authority': 'localhost',
        'content-type': 'text/plain',
      });

      const body = await withTimeout(
        new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk as Buffer));
          req.on('end', () => resolve(Buffer.concat(chunks).toString()));
          req.on('error', reject);
          req.end('hello-h2');
        }),
        3000,
        'echo never arrived'
      );

      expect(JSON.parse(body)).toEqual({ echo: 'hello-h2' });
    } finally {
      client.close();
    }
  });

  it('destroys the upstream response stream when the client aborts', async () => {
    const before = closedBackendStreams;
    const client = openClient();

    try {
      const req = client.request({
        ':method': 'GET',
        ':path': '/stream',
        ':scheme': 'https',
        ':authority': 'localhost',
      });
      req.on('error', () => {});

      await firstChunk(req);
      req.destroy();
      client.destroy();

      await waitFor(() => closedBackendStreams > before, 2000, 20);
      await waitFor(() => openBackendSessions === 0, 2000, 20);
    } finally {
      if (!client.closed && !client.destroyed) client.destroy();
    }
  });

  it('does not leave backend sessions behind after aborted streams', async () => {
    const client = openClient();
    const streamCount = 4;
    const before = closedBackendStreams;

    try {
      const reqs = Array.from({ length: streamCount }, () => {
        const req = client.request({
          ':method': 'GET',
          ':path': '/stream',
          ':scheme': 'https',
          ':authority': 'localhost',
        });
        req.on('error', () => {});
        return req;
      });

      await Promise.all(reqs.map((req) => firstChunk(req)));
      for (const req of reqs) req.destroy();
      client.destroy();

      await waitFor(() => closedBackendStreams >= before + streamCount, 2000, 20);
      await waitFor(() => openBackendSessions === 0, 2000, 20);
      expect(openBackendSessions).toBe(0);
    } finally {
      if (!client.closed && !client.destroyed) client.destroy();
    }
  });
});
