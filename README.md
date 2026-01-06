# 🚀 Robiki Proxy

> A high-performance, flexible HTTP/2 reverse proxy with WebSocket support, configurable routing, CORS, and request validation. Use it as an npm package in your Node.js application or as a standalone Docker container.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🔒 HTTP/2 & SSL/TLS Support**: Full HTTP/2 protocol support with automatic HTTP/1.1 fallback
- **🔌 WebSocket Proxying**: Seamless WebSocket connection handling and proxying
- **🌐 Flexible Routing**: Configure routes by domain/host with wildcard support
- **🛡️ CORS Management**: Global and per-route CORS configuration
- **✅ Request Validation**: Custom validation logic for authentication, rate limiting, etc.
- **🔄 URL Remapping**: Transform URLs before forwarding to target services
- **📦 Dual Usage**: Use as npm package or Docker container
- **🎯 Multi-Port Support**: Listen on multiple ports simultaneously
- **⚡ High Performance**: Built on Node.js native HTTP/2 implementation

## 📦 Installation

### As an npm Package

```bash
npm install @robiki/proxy
```

```bash
yarn add @robiki/proxy
```

### As a Docker Container

```bash
docker pull robiki/proxy:latest
```

Or build from source:

```bash
docker build -t robiki/proxy .
```

## 🚀 Quick Start

### Using as npm Package

```javascript
import { createProxy } from '@robiki/proxy';

const proxy = await createProxy({
  ports: [443, 8080],
  ssl: {
    key: './certs/key.pem',
    cert: './certs/cert.pem',
    allowHTTP1: true,
  },
  routes: {
    'api.example.com': {
      target: 'localhost:3000',
      ssl: true,
    },
    'example.com': {
      target: 'localhost:8080',
      ssl: false,
    },
  },
});

console.log('Proxy server is running!');
```

### Using with Docker

1. Create a `proxy.config.json` file:

```json
{
  "ports": [443, 8080],
  "ssl": {
    "key": "/app/certs/key.pem",
    "cert": "/app/certs/cert.pem",
    "allowHTTP1": true
  },
  "routes": {
    "api.example.com": {
      "target": "backend-service:3000",
      "ssl": true
    },
    "example.com": {
      "target": "frontend-service:8080",
      "ssl": false
    }
  }
}
```

2. Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  proxy:
    image: robiki/proxy:latest
    ports:
      - '443:443'
      - '8080:8080'
    volumes:
      - ./proxy.config.json:/app/proxy.config.json:ro
      - ./certs:/app/certs:ro
    environment:
      - PROXY_CONFIG=/app/proxy.config.json
    networks:
      - app-network

  backend-service:
    image: your-backend-image
    networks:
      - app-network

  frontend-service:
    image: your-frontend-image
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

3. Start the services:

```bash
docker-compose up -d
```

## 📖 Configuration

### Configuration File

Create a `proxy.config.json` file with the following structure:

```json
{
  "ports": [443, 8080],
  "ssl": {
    "key": "./certs/key.pem",
    "cert": "./certs/cert.pem",
    "ca": "./certs/ca.pem",
    "allowHTTP1": true
  },
  "cors": {
    "origin": "*",
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowedHeaders": ["Content-Type", "Authorization"],
    "credentials": true,
    "maxAge": 86400
  },
  "routes": {
    "api.example.com": {
      "target": "backend-service:3000",
      "ssl": true,
      "cors": {
        "origin": ["https://example.com"],
        "credentials": true
      }
    },
    "*.example.com": {
      "target": "wildcard-service:4000",
      "ssl": true
    }
  }
}
```

### Environment Variables

You can also configure the proxy using environment variables:

```bash
# SSL Configuration
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_CA=/app/certs/ca.pem
SSL_ALLOW_HTTP1=true

# CORS Configuration
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true
```

## 🎯 Advanced Usage

### URL Remapping

Transform URLs before forwarding to target services:

```javascript
const config = {
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      remap: (url) => {
        // Remove /api prefix
        return url.replace(/^\/api/, '');
      },
    },
  },
};
```

### Request Validation

Add custom validation logic for authentication, rate limiting, etc.:

```javascript
const config = {
  // Global validation
  validate: async (info) => {
    if (!info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: 'Unauthorized',
        headers: { 'www-authenticate': 'Bearer' },
      };
    }
    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // Route-specific validation
      validate: async (info) => {
        const rateLimit = await checkRateLimit(info.remoteAddress);
        if (!rateLimit.allowed) {
          return {
            status: false,
            code: 429,
            message: 'Too Many Requests',
          };
        }
        return { status: true };
      },
    },
  },
};
```

### Custom CORS Configuration

Configure CORS globally or per-route:

```javascript
const config = {
  // Global CORS
  cors: {
    origin: ['https://example.com', 'https://www.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // Route-specific CORS (overrides global)
      cors: {
        origin: '*',
        credentials: false,
      },
    },
  },
};
```

### Custom Handlers

Create custom request handlers for advanced use cases:

```javascript
import { createCustomProxy } from '@robiki/proxy';

const customRestHandler = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  // Fall back to default proxy behavior
  const { restAPIProxyHandler } = await import('@robiki/proxy/connections');
  return restAPIProxyHandler(req, res);
};

const proxy = await createCustomProxy(config, {
  rest: customRestHandler,
  websocket: customWebSocketHandler,
  stream: customStreamHandler,
});
```

## 🔧 API Reference

### `createProxy(config: ServerConfig): Promise<ProxyServer>`

Creates and starts a proxy server with the given configuration.

**Parameters:**

- `config`: Server configuration object

**Returns:** Promise that resolves to a `ProxyServer` instance

### `ProxyServer`

**Methods:**

- `start()`: Start the proxy server
- `stop()`: Stop the proxy server
- `getConfig()`: Get the current configuration

### Configuration Types

#### `ServerConfig`

```typescript
interface ServerConfig {
  ports?: number[];
  ssl?: CertificateConfig;
  routes: Record<string, RouteConfig>;
  cors?: CorsConfig;
  validate?: (info: ConnectionInfo) => Promise<ForwardValidationResult>;
}
```

#### `RouteConfig`

```typescript
interface RouteConfig {
  target: string;
  ssl?: boolean;
  remap?: (url: string) => string;
  cors?: CorsConfig;
  validate?: (info: ConnectionInfo) => Promise<ForwardValidationResult>;
}
```

#### `CorsConfig`

```typescript
interface CorsConfig {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}
```

#### `ConnectionInfo`

```typescript
interface ConnectionInfo {
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
}
```

## 🐳 Docker Usage

### Using in Another Project

1. Add the proxy to your `docker-compose.yml`:

```yaml
services:
  proxy:
    image: robiki/proxy:latest
    ports:
      - '443:443'
      - '8080:8080'
    volumes:
      - ./proxy.config.json:/app/proxy.config.json:ro
      - ./certs:/app/certs:ro
    networks:
      - your-network

  your-service:
    image: your-service-image
    networks:
      - your-network
```

2. Configure routes in `proxy.config.json` to point to your services

3. Start your stack:

```bash
docker-compose up -d
```

### Building Custom Image

Create a custom Dockerfile:

```dockerfile
FROM robiki/proxy:latest

# Copy your configuration
COPY proxy.config.json /app/proxy.config.json
COPY certs /app/certs

# Set environment variables
ENV PROXY_CONFIG=/app/proxy.config.json
```

## 📚 Examples

Check the `examples/` directory for more usage examples:

- `basic-usage.js` - Simple proxy setup
- `advanced-usage.js` - Advanced features (validation, CORS, remapping)
- `custom-handlers.js` - Custom request handlers
- `docker-compose.example.yml` - Complete Docker setup

## 🔐 SSL/TLS Certificates

### Generating Self-Signed Certificates

For development:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Using Let's Encrypt

For production, use Let's Encrypt certificates:

```bash
certbot certonly --standalone -d example.com
```

Then reference them in your config:

```json
{
  "ssl": {
    "key": "/etc/letsencrypt/live/example.com/privkey.pem",
    "cert": "/etc/letsencrypt/live/example.com/fullchain.pem"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © Robiki sp. z o.o.

## 🔗 Links

- [GitHub Repository](https://github.com/robiki-ai/robiki-proxy)
- [npm Package](https://www.npmjs.com/package/@robiki/proxy)
- [Issue Tracker](https://github.com/robiki-ai/robiki-proxy/issues)

## 💡 Use Cases

- **Microservices Architecture**: Route requests to different services based on domain/path
- **Development Environment**: Local proxy for testing multiple services
- **API Gateway**: Centralized entry point with authentication and rate limiting
- **SSL Termination**: Handle SSL/TLS at the proxy level
- **CORS Management**: Centralized CORS configuration
- **Load Balancing**: Distribute traffic across multiple instances (with custom handlers)

## 🛠️ Troubleshooting

### Port Already in Use

The proxy will automatically attempt to kill processes on the configured ports. If this fails, manually free the ports:

```bash
lsof -ti:443 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### SSL Certificate Errors

Ensure your certificate files are readable and in the correct format (PEM). For development, use self-signed certificates.

### WebSocket Connection Issues

Make sure your WebSocket routes are configured with the correct protocol (ws/wss) and that the target service supports WebSocket connections.

## 📊 Performance

The proxy is built on Node.js native HTTP/2 implementation and is designed for high performance:

- Efficient stream handling
- Minimal overhead
- Connection pooling
- Automatic HTTP/1.1 fallback

For production deployments, consider:

- Using a process manager (PM2, systemd)
- Enabling clustering for multi-core systems
- Monitoring with health checks
- Setting up proper logging
