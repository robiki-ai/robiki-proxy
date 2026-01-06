import { type IncomingHttpHeaders, type IncomingMessage } from 'node:http';
import { WebSocket } from 'ws';
import { type TLSWebSocket } from '../utils/server';
import { type ProxyConfig } from '../utils/config';

const DEBUG = process.env.DEBUG === 'true';

export const websocketAPIProxyHandler = async (
  req: IncomingMessage,
  socket: TLSWebSocket,
  headers: IncomingHttpHeaders,
  config: ProxyConfig
) => {
  const { target, ssl, remap } = config.getTarget(req.headers.host || '');

  if (!target) return socket.close();

  if (DEBUG) console.log('HTTP2 websocket proxy', `${ssl ? 'https' : 'http'}://${target}${req.url}`, headers.host);

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

  proxy.on('message', (message) => {
    if (message.toString('utf8').startsWith('{')) {
      socket.send(message.toString('utf8'));
    } else {
      socket.send(message);
    }
  });
  socket.on('message', (message) => proxy.send(message));

  proxy.on('close', () => socket.close());
  socket.on('close', () => proxy.close());

  proxy.on('error', (error) => {
    if (DEBUG) console.error('WebSocket proxy error:', error);
    socket.close();
  });
};
