/*
 * Regression tests: abrupt peer disconnects must never kill the proxy process.
 *
 * The proxy runs in a child process (library mode, no standalone
 * uncaughtException handlers) so any uncaught exception or unhandled
 * rejection makes the child exit, which these tests would catch.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo, type Socket } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import { findAvailablePort, withTimeout } from '../helpers/test-utils';

const TSX = 'node_modules/.bin/tsx';
const FIXTURE = 'tests/helpers/fixtures/proxy-child.ts';

function startProxyChild(port: number, target: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(TSX, [FIXTURE], {
      cwd: process.cwd(),
      env: { ...process.env, PROXY_PORT: String(port), PROXY_TARGET: target },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      /* createProxy() resolves before listen() fires; wait for the port. */
      if (output.includes('PROXY_READY') && output.includes('Server is listening')) {
        child.stdout!.off('data', onData);
        child.off('exit', onStartupExit);
        resolve(child);
      }
    };
    const onStartupExit = (code: number | null, signal: NodeJS.Signals | null) => {
      reject(new Error(`proxy exited during startup (code=${code} signal=${signal}): ${output}`));
    };

    child.stdout!.on('data', onData);
    child.stderr!.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', reject);
    child.once('exit', onStartupExit);
  });
}

function killAndWait(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 1000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

function closeNetServer(server: {
  close: (cb?: (err?: Error) => void) => void;
  closeAllConnections?: () => void;
}): void {
  server.closeAllConnections?.();
  server.close();
}

function closeWss(wss: WebSocketServer): void {
  for (const client of wss.clients) client.terminate();
  wss.close();
}

/** An uncaughtException kills the process on the next tick; a short settle is enough. */
function assertChildSurvives(child: ChildProcess, settleMs = 150): Promise<void> {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      reject(new Error(`proxy already exited with ${child.exitCode}`));
      return;
    }
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      reject(new Error(`proxy exited with code=${code} signal=${signal}`));
    };
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolve();
    }, settleMs);
    child.once('exit', onExit);
  });
}

describe('Abrupt disconnect resilience', () => {
  const cleanups: (() => void | Promise<void>)[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanups.splice(0).map(async (cleanup) => {
        try {
          await cleanup();
        } catch {
          /* already closed */
        }
      })
    );
  });

  it('survives a WebSocket message sent while the upstream is still connecting', async () => {
    /* Backend accepts TCP but never completes the WebSocket handshake,
       like a service in the middle of shutting down */
    const sockets: Socket[] = [];
    const backend = createServer((socket) => {
      sockets.push(socket);
      socket.on('error', () => {});
    });
    await new Promise<void>((resolve) => backend.listen(0, '127.0.0.1', resolve));
    const backendPort = (backend.address() as AddressInfo).port;
    cleanups.push(() => {
      for (const socket of sockets) socket.destroy();
      closeNetServer(backend);
    });

    const proxyPort = await findAvailablePort();
    const proxy = await withTimeout(
      startProxyChild(proxyPort, `127.0.0.1:${backendPort}`),
      5000,
      'proxy child never became ready'
    );
    cleanups.push(() => killAndWait(proxy));

    const client = new WebSocket(`ws://localhost:${proxyPort}/`);
    client.on('error', () => {});
    cleanups.push(() => client.close());

    await withTimeout(
      new Promise<void>((resolve) => client.once('open', resolve)),
      3000,
      'client never connected to proxy'
    );
    client.send('message-during-connecting');

    await assertChildSurvives(proxy);
    expect(proxy.exitCode).toBeNull();
  });

  it('buffers WebSocket messages sent before the upstream is open and delivers them', async () => {
    const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise<void>((resolve) => wss.once('listening', resolve));
    const backendPort = (wss.address() as AddressInfo).port;
    wss.on('connection', (ws) => {
      ws.on('message', (message) => ws.send(message));
    });
    cleanups.push(() => closeWss(wss));

    const proxyPort = await findAvailablePort();
    const proxy = await withTimeout(
      startProxyChild(proxyPort, `127.0.0.1:${backendPort}`),
      5000,
      'proxy child never became ready'
    );
    cleanups.push(() => killAndWait(proxy));

    const client = new WebSocket(`ws://localhost:${proxyPort}/`);
    client.on('error', () => {});
    cleanups.push(() => client.close());

    const echoed = new Promise<string>((resolve) => {
      client.once('message', (message) => resolve(message.toString()));
    });
    /* Sent as soon as the client handshake completes, typically before the
       proxy's upstream socket has finished connecting */
    client.once('open', () => client.send('early-message'));

    expect(await withTimeout(echoed, 3000, 'echo never arrived')).toBe('early-message');
    expect(proxy.exitCode).toBeNull();
  });

  it('survives an abrupt client disconnect (RST) while data is flowing', async () => {
    const wss = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    await new Promise<void>((resolve) => wss.once('listening', resolve));
    const backendPort = (wss.address() as AddressInfo).port;
    wss.on('connection', (ws) => {
      const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('x'.repeat(1024));
      }, 10);
      ws.on('close', () => clearInterval(timer));
      ws.on('error', () => clearInterval(timer));
    });
    cleanups.push(() => closeWss(wss));

    const proxyPort = await findAvailablePort();
    const proxy = await withTimeout(
      startProxyChild(proxyPort, `127.0.0.1:${backendPort}`),
      5000,
      'proxy child never became ready'
    );
    cleanups.push(() => killAndWait(proxy));

    const client = new WebSocket(`ws://localhost:${proxyPort}/`);
    client.on('error', () => {});
    cleanups.push(() => client.close());

    await withTimeout(
      new Promise<void>((resolve) => client.once('open', resolve)),
      3000,
      'client never connected to proxy'
    );
    await withTimeout(
      new Promise<void>((resolve) => client.once('message', () => resolve())),
      3000,
      'no data from backend'
    );

    /* Simulates a SIGKILLed service: kernel sends RST instead of FIN */
    const socket = (client as unknown as { _socket: Socket })._socket;
    socket.resetAndDestroy();

    await assertChildSurvives(proxy);
    expect(proxy.exitCode).toBeNull();
  });
});
