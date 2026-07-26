import { type IncomingHttpHeaders, type IncomingMessage } from 'node:http';
import { WebSocket } from 'ws';
import { type TLSWebSocket } from '../utils/server';
import { type ProxyConfig } from '../utils/config';
import { debug } from '../utils/console';

export const websocketAPIProxyHandler = async (
  req: IncomingMessage,
  socket: TLSWebSocket,
  headers: IncomingHttpHeaders,
  config: ProxyConfig
) => {
  const { target, ssl, remap } = config.getTarget(req.headers.host || '');

  if (!target) return socket.close();

  debug(`HTTP2 websocket proxy for ${headers.host}`, `${ssl ? 'https' : 'http'}://${target}${req.url}`);

  if (remap) req.url = remap(req.url || '');

  const proxy = new WebSocket(
    `${ssl ? 'wss' : 'ws'}://${target}${req.url || ''}`,
    req.headers['sec-websocket-protocol']?.split(',').map((p) => p.trim()),
    {
      ...(ssl ? { ...ssl, rejectUnauthorized: false } : {}),
      headers: req.headers,
      host: req.headers.host,
      origin: req.headers.origin,
      protocol: req.headers['sec-websocket-protocol'],
    }
  );

  /* The client handshake completes before the upstream socket is open, so
     early client messages must be buffered: ws throws synchronously when
     sending on a CONNECTING socket, which would crash the whole process */
  const pending: any[] = [];

  proxy.on('open', () => {
    for (const message of pending) proxy.send(message);
    pending.length = 0;
  });

  proxy.on('message', (message) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (message.toString('utf8').startsWith('{')) {
      socket.send(message.toString('utf8'));
    } else {
      socket.send(message);
    }
  });

  socket.on('message', (message) => {
    if (proxy.readyState === WebSocket.CONNECTING) {
      pending.push(message);
      return;
    }
    if (proxy.readyState === WebSocket.OPEN) proxy.send(message);
  });

  proxy.on('close', () => socket.close());
  socket.on('close', () => proxy.close());

  proxy.on('error', (error) => {
    debug('WebSocket proxy error:', error);
    socket.close();
  });

  /* An 'error' event with no listener (abrupt disconnect, protocol
     violation) throws an uncaught exception that kills the whole process */
  socket.on('error', (error) => {
    debug('WebSocket client error:', error);
    proxy.close();
  });
};
