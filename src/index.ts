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
      for (const port of ports) {
        let server: NET | HTTP;

        if (ssl) {
          /* Use HTTP/2 with SSL */
          server = http2(restAPIProxyHandler, streamAPIProxyHandler, { ...ssl, port });
        } else {
          /* Use HTTP/1.1 without SSL */
          server = http(restAPIProxyHandler, { port });
        }

        websocket(server, websocketAPIProxyHandler, (info) => this.config.validate(info));
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
    for (const server of this.servers) {
      server.close();
    }
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
 */
export function createProxy(config?: Partial<ServerConfig>): Promise<ProxyServer> {
  const createProxyInstance = () => {
    return new ProxyServer(loadConfig(config));
  };

  const startProxy = (proxy: ProxyServer) => {
    return proxy.start().then(() => proxy);
  };

  return Promise.resolve()
    .then(() => createProxyInstance())
    .then((proxy) => startProxy(proxy));
}

/**
 * Create a proxy server with custom handlers
 */
export function createCustomProxy(
  config: Partial<ServerConfig> | undefined,
  handlers: {
    rest?: Router;
    stream?: Streamer;
    websocket?: WebSocketRouter;
  }
): Promise<ProxyServer> {
  const servers: (NET | HTTP)[] = [];

  const initializeConfig = () => {
    const proxyConfig = loadConfig(config);
    return {
      ssl: proxyConfig.getSSL(),
      ports: proxyConfig.getPorts(),
      proxyConfig,
    };
  };

  const logStartup = (cfg: { ssl: any; ports: number[]; proxyConfig: ProxyConfig }) => {
    console.log('STARTING CUSTOM PROXY SERVER....');
    return cfg;
  };

  const createServers = ({ ssl, ports, proxyConfig }: { ssl: any; ports: number[]; proxyConfig: ProxyConfig }) => {
    for (const port of ports) {
      let server: NET | HTTP;

      if (ssl) {
        /* Use HTTP/2 with SSL */
        server = http2(handlers.rest || restAPIProxyHandler, handlers.stream || streamAPIProxyHandler, {
          ...ssl,
          port,
        });
      } else {
        /* Use HTTP/1.1 without SSL */
        server = http(handlers.rest || restAPIProxyHandler, { port });
      }

      websocket(server, handlers.websocket || websocketAPIProxyHandler);
      servers.push(server);
    }
    return proxyConfig;
  };

  const createProxyInstance = (proxyConfig: ProxyConfig) => {
    console.log('Custom proxy server started successfully');

    return {
      getConfig: () => proxyConfig,
      start: async () => {},
      stop: async () => {
        for (const server of servers) {
          server.close();
        }
      },
    } as ProxyServer;
  };

  const handleError = (error: any) => {
    console.error('Failed to start custom proxy server:', error);
    throw error;
  };

  return Promise.resolve()
    .then(() => initializeConfig())
    .then((cfg) => logStartup(cfg))
    .then((cfg) => createServers(cfg))
    .then((proxyConfig) => createProxyInstance(proxyConfig))
    .catch((error) => handleError(error));
}

/* Export connection handlers */
export { restAPIProxyHandler, streamAPIProxyHandler, websocketAPIProxyHandler } from './connections';

/* Export configuration utilities */
export { loadConfig, getConfig } from './utils/config';

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

  const startProxyServer = () => {
    return createProxy();
  };

  const handleStartupError = (error: any) => {
    console.error('Failed to start proxy server:', error);
    process.exit(1);
  };

  setupErrorHandlers();

  Promise.resolve()
    .then(() => startProxyServer())
    .catch((error) => handleStartupError(error));
}
