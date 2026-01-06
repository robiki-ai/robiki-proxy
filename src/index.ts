import { http, http2, websocket, type Router, type WebSocketRouter, type Streamer } from './utils/server';
import { restAPIProxyHandler, streamAPIProxyHandler, websocketAPIProxyHandler } from './connections';
import { loadConfig, type ServerConfig, type ProxyConfig } from './utils/config';
import type { Server as NET } from 'node:net';
import type { Server as HTTP } from 'node:http';

/**
 * Proxy server instance
 */
export class ProxyServer {
  private config: ProxyConfig;
  private servers: (NET | HTTP)[] = [];

  constructor(config: ProxyConfig) {
    this.config = config;
  }

  /**
   * Start the proxy server
   */
  async start(): Promise<void> {
    const ssl = this.config.getSSL();
    const ports = this.config.getPorts();

    const logStartup = () => {
      console.log('STARTING PROXY SERVER....');
      console.log('Ports:', ports);
      console.log('SSL:', !!ssl);
      return { ssl, ports };
    };

    const createServers = ({ ssl, ports }: { ssl: any; ports: number[] }) => {
      const boundRestHandler = (req: any, res: any) => {
        /* Health check endpoint */
        if (req.url === '/robiki-proxy/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');
          return;
        }
        return restAPIProxyHandler(req, res, this.config);
      };
      const boundStreamHandler = (stream: any, headers: any) => streamAPIProxyHandler(stream, headers, this.config);
      const boundWebsocketHandler = (req: any, socket: any, headers: any) =>
        websocketAPIProxyHandler(req, socket, headers, this.config);

      for (const port of ports) {
        let server: NET | HTTP;

        if (ssl) {
          /* Use HTTP/2 with SSL */
          server = http2(boundRestHandler, boundStreamHandler, { ...ssl, port });
        } else {
          /* Use HTTP/1.1 without SSL */
          server = http(boundRestHandler, { port });
        }

        websocket(server, boundWebsocketHandler, (info) => this.config.validate(info));
        this.servers.push(server);
      }
      return this.servers;
    };

    const logSuccess = () => {
      console.log('Proxy server started successfully');
    };

    const handleError = (error: any) => {
      console.error('Failed to start proxy server:', error);
      throw error;
    };

    return Promise.resolve()
      .then(() => logStartup())
      .then((config) => createServers(config))
      .then(() => logSuccess())
      .catch((error) => handleError(error));
  }

  /**
   * Stop the proxy server
   */
  async stop(): Promise<void> {
    console.log('Stopping proxy server...');
    await Promise.all(
      this.servers.map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          })
      )
    );
    this.servers = [];
    console.log('Proxy server stopped');
  }

  /**
   * Get the configuration
   */
  getConfig(): ProxyConfig {
    return this.config;
  }
}

/**
 * Create and start a proxy server
 * Supports config file types: .json, .ts, .js
 *
 * Promise chain:
 * 1. Load configuration from file/env/programmatic
 * 2. Initialize SSL certificates
 * 3. Create proxy server instance
 * 4. Start listening on configured ports
 */
export async function createProxy(config?: Partial<ServerConfig>): Promise<ProxyServer> {
  return loadConfig(config).then((proxyConfig) => {
    const proxy = new ProxyServer(proxyConfig);
    return proxy.start().then(() => proxy);
  });
}

/**
 * Create a proxy server with custom handlers
 *
 * Promise chain:
 * 1. Load configuration from file/env/programmatic
 * 2. Initialize SSL certificates
 * 3. Create servers with custom handlers
 */
export async function createCustomProxy(
  config: Partial<ServerConfig> | undefined,
  handlers: {
    rest?: Router;
    stream?: Streamer;
    websocket?: WebSocketRouter;
  }
): Promise<ProxyServer> {
  console.log('STARTING CUSTOM PROXY SERVER....');

  return loadConfig(config).then((proxyConfig) => {
    const servers: (NET | HTTP)[] = [];
    const ssl = proxyConfig.getSSL();
    const ports = proxyConfig.getPorts();

    // Create bound handlers with config
    const boundRestHandler = (req: any, res: any) => {
      /* Health check endpoint */
      if (req.url === '/robiki-proxy/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
      }
      return restAPIProxyHandler(req, res, proxyConfig);
    };
    const boundStreamHandler = (stream: any, headers: any) => streamAPIProxyHandler(stream, headers, proxyConfig);
    const boundWebsocketHandler = (req: any, socket: any, headers: any) =>
      websocketAPIProxyHandler(req, socket, headers, proxyConfig);

    for (const port of ports) {
      let server: NET | HTTP;

      if (ssl) {
        /* Use HTTP/2 with SSL */
        server = http2(handlers.rest || boundRestHandler, handlers.stream || boundStreamHandler, {
          ...ssl,
          port,
        });
      } else {
        /* Use HTTP/1.1 without SSL */
        server = http(handlers.rest || boundRestHandler, { port });
      }

      websocket(server, handlers.websocket || boundWebsocketHandler, (info) => proxyConfig.validate(info));
      servers.push(server);
    }

    console.log('Custom proxy server started successfully');

    return {
      getConfig: () => proxyConfig,
      start: async () => {},
      stop: async () => {
        await Promise.all(
          servers.map(
            (server) =>
              new Promise<void>((resolve, reject) => {
                server.close((err) => {
                  if (err) reject(err);
                  else resolve();
                });
              })
          )
        );
      },
    } as ProxyServer;
  });
}

/* Export connection handlers */
export { restAPIProxyHandler, streamAPIProxyHandler, websocketAPIProxyHandler } from './connections';

/* Export configuration utilities */
export { loadConfig } from './utils/config';

/* Export types */
export type { ServerConfig, RouteConfig, CorsConfig, CertificateConfig, ProxyConfig } from './utils/config';
export type { Router, WebSocketRouter, Streamer, ConnectionInfo, ForwardValidationResult } from './utils/server';
export { RequestType } from './utils/server';

/* Standalone mode - only run if this is the main module */
if (import.meta.url === `file://${process.argv[1]}`) {
  const setupErrorHandlers = () => {
    process.on('uncaughtException', function (error: Error) {
      console.log('UNCAUGHT EXCEPTION: ', error);
    });

    process.on('unhandledRejection', function (reason: any, promise: Promise<any>) {
      console.log('UNHANDLED REJECTION: ', reason, promise);
    });
  };

  const startProxyServer = async () => {
    return await createProxy();
  };

  const handleStartupError = (error: any) => {
    console.error('Failed to start proxy server:', error);
    process.exit(1);
  };

  setupErrorHandlers();

  startProxyServer().catch((error) => handleStartupError(error));
}
