/*
 * Regression tests: abrupt peer disconnects must never kill the proxy process.
 *
 * The proxy runs in a child process (library mode, no standalone
 * uncaughtException handlers) so any uncaught exception or unhandled
 * rejection makes the child exit, which these tests would catch.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Socket } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import { delay, withTimeout } from '../helpers/test-utils';

const TSX = 'node_modules/.bin/tsx';
const FIXTURE = 'tests/helpers/fixtures/proxy-child.ts';

function startProxyChild(port: number, target: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(TSX, [FIXTURE], {
      cwd: process.cwd(),
      env: { ...process.env, PROXY_PORT: String(port), PROXY_TARGET: target },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout!.on('data', (d) => {
      if (d.toString().includes('PROXY_READY')) setTimeout(() => resolve(child), 300);
    });
    child.on('error', reject);
  });
}

describe('Abrupt disconnect resilience', () => {
  const cleanups: (() => void)[] = [];

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) {
      try {
        cleanup();
      } catch {
        /* already closed */
      }
    }
    await delay(200);
  });

  it('survives a WebSocket message sent while the upstream is still connecting', async () => {
    /* Backend accepts TCP but never completes the WebSocket handshake,
       like a service in the middle of shutting down */
    const backend = createServer(() => {});
    await new Promise<void>((resolve) => backend.listen(19101, resolve));
    cleanups.push(() => backend.close());

    const proxy = await startProxyChild(19100, 'localhost:19101');
    cleanups.push(() => proxy.kill());

    const client = new WebSocket('ws://localhost:19100/');
    client.on('error', () => {});
    cleanups.push(() => client.close());

    await withTimeout(
      new Promise<void>((resolve) => client.on('open', resolve)),
      3000,
      'client never connected to proxy'
    );
    client.send('message-during-connecting');

    await delay(1500);
    expect(proxy.exitCode).toBeNull();
  }, 15000);

  it('buffers WebSocket messages sent before the upstream is open and delivers them', async () => {
    const wss = new WebSocketServer({ port: 19103 });
    wss.on('connection', (ws) => {
      ws.on('message', (message) => ws.send(message));
    });
    cleanups.push(() => wss.close());

    const proxy = await startProxyChild(19102, 'localhost:19103');
    cleanups.push(() => proxy.kill());

    const client = new WebSocket('ws://localhost:19102/');
    client.on('error', () => {});
    cleanups.push(() => client.close());

    const echoed = new Promise<string>((resolve) => {
      client.on('message', (message) => resolve(message.toString()));
    });
    /* Sent as soon as the client handshake completes, typically before the
       proxy's upstream socket has finished connecting */
    client.on('open', () => client.send('early-message'));

    expect(await withTimeout(echoed, 3000, 'echo never arrived')).toBe('early-message');
    expect(proxy.exitCode).toBeNull();
  }, 15000);

  it('survives an abrupt client disconnect (RST) while data is flowing', async () => {
    const wss = new WebSocketServer({ port: 19105 });
    wss.on('connection', (ws) => {
      const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('x'.repeat(16384));
      }, 2);
      ws.on('close', () => clearInterval(timer));
      ws.on('error', () => clearInterval(timer));
    });
    cleanups.push(() => wss.close());

    const proxy = await startProxyChild(19104, 'localhost:19105');
    cleanups.push(() => proxy.kill());

    const client = new WebSocket('ws://localhost:19104/');
    client.on('error', () => {});
    cleanups.push(() => client.close());

    await withTimeout(
      new Promise<void>((resolve) => client.on('open', resolve)),
      3000,
      'client never connected to proxy'
    );
    await delay(300);

    /* Simulates a SIGKILLed service: kernel sends RST instead of FIN */
    const socket = (client as unknown as { _socket: Socket })._socket;
    socket.resetAndDestroy();

    await delay(1500);
    expect(proxy.exitCode).toBeNull();
  }, 15000);
});
