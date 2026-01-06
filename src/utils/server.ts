import net, { type Server as NET } from 'node:net';
import {
  createServer as startHTTP,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type Server as HTTP,
} from 'node:http';
import { createServer as startHTTPS } from 'node:https';
import {
  constants,
  createServer as startHTTP2,
  createSecureServer as startHTTPS2,
  type IncomingHttpHeaders,
} from 'node:http2';
import { type Duplex } from 'node:stream';
import { type TLSSocket, type Server as TLS } from 'node:tls';
import { exec } from 'node:child_process';
import WebSocket, { WebSocketServer } from 'ws';
import { num } from './uuid';

export enum RequestType {
  API = 'api',
  STREAM = 'stream',
  WEBSOCKET = 'websocket',
}

export interface NodeError extends Error {
  code: string;
}

export interface TLSWebSocket extends WebSocket {
  _socket: TLSSocket;
}

export type Router = (req: any, res: any) => void;
export type WebSocketRouter = (req: IncomingMessage, socket: TLSWebSocket, headers: IncomingHttpHeaders) => void;
export type Streamer = (stream: any, headers: any, flags: any) => void;

export interface ServerOpts {
  key?: string | Buffer;
  cert?: string | Buffer;
  ca?: string | Buffer;
}

export interface Http2ServerOpts extends ServerOpts {
  allowHTTP1?: boolean;
  port?: number;
}

export interface WebsocketValidation {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

export interface ForwardValidationResult {
  status: boolean;
  message?: string;
  code?: number;
  headers?: OutgoingHttpHeaders;
}

export interface ConnectionInfo {
  id: number;
  method: string;
  path: string;
  remoteAddress: string;
  scheme: string;
  authority: string;
  origin: string;
  headers: IncomingHttpHeaders;
  query: URLSearchParams;
  type: RequestType;
  respond: (status: number, headers?: Record<string, string>, body?: string) => void;
  end: (body?: string) => void;
}

export const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD, HTTP2_HEADER_SCHEME, HTTP2_HEADER_AUTHORITY } = constants;
export const HTTP2_HEADER_REQUEST_TYPE = 'x-api-type';

/**
 * Kills a process on a given port
 *
 * @param {number} port - The port to kill the process on
 * @returns {Promise<void>} A promise that resolves when the process is killed
 * @example
 * kill(3000)
 */
export const kill = (port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to kill process on port ${port}...`);
    exec(`sleep 3 && kill -9 $(lsof -t -i:${port})`, (err) => {
      if (err && err.message.indexOf('ENOENT') === -1) return reject(err);
      return resolve();
    });
  });
};

/**
 * Checks if a port is taken
 *
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} A promise that resolves to a boolean
 * @example
 * isPortTaken(3000)
 * // => true
 */
export const isPortTaken = (port: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once('error', (err: NodeError) => {
        if (err.code !== 'EADDRINUSE') return reject(err);
        resolve(true);
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port);
  });
};

/**
 * Allocates a port if the given port is taken
 *
 * @param {number} port - The port to allocate
 * @returns {Promise<void>} A promise that resolves when the port is allocated
 * @example
 * allocatePort(3000)
 */
export const allocatePort = (port: number) => {
  return isPortTaken(port).then((isTaken) => {
    if (!isTaken) return;
    return kill(port);
  });
};

/**
 * Returns the CORS headers
 *
 * @param {string} origin - The origin to allow
 * @returns {OutgoingHttpHeaders} The CORS headers
 */
export const getCorsHeaders = (origin: string): OutgoingHttpHeaders => {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-credentials': 'true',
  };
};

/**
 * Converts HTTP/1.1 headers to HTTP/2 headers
 *
 * @param {IncomingHttpHeaders} headers - The headers to convert
 * @returns {IncomingHttpHeaders} The converted headers
 */
export const http1ToHttp2Headers = (headers: IncomingHttpHeaders): IncomingHttpHeaders => {
  const http2Headers: IncomingHttpHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    switch (key.toLowerCase()) {
      case 'host':
        http2Headers[':authority'] = value as string;
        break;
      /* HTTP/1.1-specific and WebSocket-specific headers */
      case 'connection':
      case 'upgrade':
      case 'http2-settings':
      case 'sec-websocket-key':
      case 'sec-websocket-version':
      case 'sec-websocket-protocol':
      case 'sec-websocket-extensions':
      case 'keep-alive':
      case 'transfer-encoding':
      case 'te':
        break;
      /* Other headers */
      default:
        http2Headers[key] = value as string;
    }
  }
  return http2Headers;
};

/**
 * Converts HTTP/2 headers to HTTP/1.1 headers
 *
 * @param {IncomingHttpHeaders} headers - The headers to convert
 * @returns {IncomingHttpHeaders} The converted headers
 */
export const http2HeadersToHttp1Headers = (headers: IncomingHttpHeaders): IncomingHttpHeaders => {
  const http1Headers: IncomingHttpHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    switch (key) {
      case ':authority':
        http1Headers['host'] = value as string;
        break;
      /* HTTP/2 pseudo-headers */
      case ':method':
      case ':path':
      case ':scheme':
      case ':status':
        break;
      /* Other headers */
      default:
        http1Headers[key.replace(':', '')] = value as string;
    }
  }
  return http1Headers;
};

export interface HttpServerOpts extends ServerOpts {
  port?: number;
}

/**
 * Starts an HTTP/S server
 *
 * @param {router} routes - The routes to use
 * @param {HttpServerOpts} [opts] - The options to use
 * @returns {Server} The HTTP/S server
 * @example
 * http(routes)
 * // => Server { ... }
 */
export const http = (routes: Router, opts?: HttpServerOpts): HTTP => {
  const port = opts?.port || 8080;
  const sslOpts = opts && (opts.key || opts.cert) ? { key: opts.key, cert: opts.cert, ca: opts.ca } : undefined;

  return (sslOpts ? startHTTPS(sslOpts, routes) : startHTTP(routes))
    .listen(port, '0.0.0.0', () => {
      console.log(`Server is listening on 0.0.0.0:${port}`);
    })
    .on('error', async (err) => {
      if (err && err.message.indexOf('EADDRINUSE') !== -1) {
        console.log(`Port ${port} is already in use, attempting to kill process...`);
        return allocatePort(port).then(() => http(routes, opts));
      }
      console.log('Server error: ', err);
      throw err;
    });
};

/**
 * Starts an HTTP2 server
 *
 * @param {router} routes - The routes to use
 * @param {streamer} streams - The streams to use
 * @param {Http2ServerOpts} [opts] - The options to use
 * @returns {Http2Server} The HTTP2 server
 * @example
 * startHTTP2(routes, streams)
 * // => Http2Server { ... }
 */
export const http2 = (routes?: Router, streams?: Streamer, opts?: Http2ServerOpts): NET => {
  return (opts ? startHTTPS2(opts, routes) : startHTTP2(routes))
    .listen(opts?.port || 3000, '0.0.0.0', () => {
      console.log(`Server is listening on 0.0.0.0:${opts?.port || 3000}`);
    })
    .on('stream', (stream, headers, flags) => streams && streams(stream, headers, flags))
    .on('error', async (err) => {
      if (err && err.message.indexOf('EADDRINUSE') !== -1) {
        console.log(`Port ${opts?.port || 3000} is already in use, attempting to kill process...`);
        return allocatePort(opts?.port || 3000).then(() => http2(routes, streams, opts));
      }
      console.log('Server error: ', err);
      throw err;
    });
};

/**
 * Starts a WebSocket server
 *
 * @param {server} server - The server to use
 * @param {router} routes - The routes to use
 * @param {function} [validate] - The validation function
 * @returns {WebSocketServer} The WebSocket server
 * @example
 * ws(routes)
 * // => WebSocketServer { ... }
 */
export const websocket = (
  server: HTTP | NET | TLS,
  routes: WebSocketRouter,
  validate?: (info: ConnectionInfo) => Promise<ForwardValidationResult>
): WebSocketServer => {
  /* Create a WebSocket server */
  const wss = new WebSocketServer({
    noServer: true,
    verifyClient: ({ secure, req }: WebsocketValidation, callback) => {
      /* Validate the request */
      if (validate) {
        const { headers, method, url, socket } = req;
        const query = new URLSearchParams(req.url?.split('?')[1] || '');

        /* Create a forward validation object */
        const info: ConnectionInfo = {
          id: num(),
          scheme: !!secure ? 'https' : 'http',
          authority: headers.host || '',
          origin: headers.origin || '',
          method: method || 'GET',
          path: url || '/',
          remoteAddress: socket.remoteAddress || '',
          headers,
          query,
          type: RequestType.WEBSOCKET,
          respond: (status, headers = {}, body?: string) => {
            if (body) {
              socket.push({ ':status': status, ...headers, ...getCorsHeaders(info.origin) });
              return socket.push(body);
            }
            socket.push({ ':status': status, ...headers, ...getCorsHeaders(info.origin) });
            return socket.push('');
          },
          end: (body?: string) => {
            if (body) return socket.end(body);
            return socket.end();
          },
        };
        return validate(info)
          .then(({ status, message, code, headers }) => {
            console.log('Validated WebSocket request', status, code, message, headers);
            callback(status, code || 500, message || 'Internal Server Error', headers);
          })
          .catch(() => callback(false, 500, 'Internal Server Error'));
      }
      return callback(true);
    },
  });

  server.on('upgrade', async (request: IncomingMessage, socket: Duplex, upgradeHead: Buffer) => {
    return wss.handleUpgrade(request, socket, upgradeHead, (connection) =>
      routes(request, connection as TLSWebSocket, request.headers)
    );
  });
  console.log('Websocket server started');
  return wss;
};
