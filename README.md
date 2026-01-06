# 🚀 Robiki Proxy

> A high-performance HTTP/2 reverse proxy with WebSocket support, configurable routing, CORS, and request validation. Use as an npm package or Docker container for local development environments.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Languages

[English](docs/README.md) | [Deutsch](docs/README.de.md) | [中文](docs/README.zh.md) | [日本語](docs/README.ja.md) | [Polski](docs/README.pl.md) | [Español](docs/README.es.md) | [Русский](docs/README.ru.md)

## ✨ Features

- **🔒 HTTP/2 & SSL/TLS Support**: Full HTTP/2 protocol support with automatic HTTP/1.1 fallback
- **🔌 WebSocket Proxying**: Seamless WebSocket connection handling and proxying
- **🌐 Flexible Routing**: Configure routes by domain/host with wildcard support
- **🛡️ CORS Management**: Global and per-route CORS configuration
- **✅ Request Validation**: Custom validation logic for authentication, rate limiting, etc.
- **🔄 URL Remapping**: Transform URLs before forwarding to target services
- **📦 Dual Usage**: Use as npm package or Docker container
- **⚙️ JavaScript & TypeScript Config Support**: Use `.js` or `.ts` config files with functions in Docker
- **🎯 Multi-Port Support**: Listen on multiple ports simultaneously
- **⚡ High Performance**: Built on Node.js native HTTP/2 implementation

## 📦 Installation

### npm Package

```bash
npm install @robiki/proxy
# or
yarn add @robiki/proxy
```

### Docker

```bash
docker pull robiki/proxy:latest
```

## 🚀 Quick Start

### npm Package

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
```

### Docker

Create `proxy.config.json`:

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
    }
  }
}
```

Create `docker-compose.yml`:

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
    environment:
      - PROXY_CONFIG=/app/proxy.config.json
```

Start:

```bash
docker-compose up -d
```

## 📖 Configuration

### JSON Configuration

Simple declarative configuration:

```json
{
  "ports": [443, 8080],
  "ssl": {
    "key": "./certs/key.pem",
    "cert": "./certs/cert.pem",
    "allowHTTP1": true
  },
  "cors": {
    "origin": "*",
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "credentials": true
  },
  "routes": {
    "api.example.com": {
      "target": "backend:3000",
      "ssl": true
    },
    "*.example.com": {
      "target": "wildcard-service:4000",
      "ssl": true
    }
  }
}
```

### JavaScript Configuration

For advanced features like URL remapping and validation:

```javascript
// proxy.config.js
export default {
  ports: [443, 8080],
  ssl: {
    key: './certs/key.pem',
    cert: './certs/cert.pem',
    allowHTTP1: true,
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // URL remapping
      remap: (url) => url.replace(/^\/api/, ''),
      // Request validation
      validate: async (info) => {
        if (!info.headers.authorization) {
          return {
            status: false,
            code: 401,
            message: 'Unauthorized',
          };
        }
        return { status: true };
      },
    },
  },
};
```

### TypeScript Configuration

Type-safe configuration with full IDE support:

```typescript
// proxy.config.ts
import type { ServerConfig, ConnectionInfo } from '@robiki/proxy';

const config: ServerConfig = {
  ports: [443, 8080],
  ssl: {
    key: './certs/key.pem',
    cert: './certs/cert.pem',
    allowHTTP1: true,
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      remap: (url: string) => url.replace(/^\/api/, ''),
      validate: async (info: ConnectionInfo) => {
        if (!info.headers['x-api-key']) {
          return { status: false, code: 401, message: 'API Key Required' };
        }
        return { status: true };
      },
    },
  },
};

export default config;
```

### Environment Variables

```bash
# SSL Configuration
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_ALLOW_HTTP1=true

# CORS Configuration
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# Debug Mode
DEBUG=true
```

## 🔧 API Reference

### `createProxy(config: ServerConfig)`

Creates and starts a proxy server.

**ServerConfig:**

```typescript
interface ServerConfig {
  ports?: number[];
  ssl?: {
    key: string;
    cert: string;
    ca?: string;
    allowHTTP1?: boolean;
  };
  routes: Record<string, RouteConfig>;
  cors?: CorsConfig;
  validate?: (info: ConnectionInfo) => Promise<ForwardValidationResult>;
}
```

**RouteConfig:**

```typescript
interface RouteConfig {
  target: string;
  ssl?: boolean;
  remap?: (url: string) => string;
  cors?: CorsConfig;
  validate?: (info: ConnectionInfo) => Promise<ForwardValidationResult>;
}
```

## 🐳 Docker Usage

Mount your config file (JSON, .js, or .ts):

```yaml
services:
  proxy:
    image: robiki/proxy:latest
    volumes:
      - ./proxy.config.js:/usr/src/proxy.config.js:ro
      - ./certs:/usr/src/certs:ro
    environment:
      - PROXY_CONFIG=/usr/src/proxy.config.js
```

## 🔐 SSL Certificates

### Development (Self-Signed)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Production (Let's Encrypt)

```bash
certbot certonly --standalone -d example.com
```

## 🛠️ Troubleshooting

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true node your-script.js
# or
docker run -e DEBUG=true robiki/proxy:latest
```

### Port Already in Use

```bash
lsof -ti:443 | xargs kill -9
```

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:coverage

# Docker tests
yarn test:docker
```

## 📚 Examples

Check the `examples/` directory:

- `basic-usage.js` - Simple proxy setup
- `advanced-usage.js` - Validation, CORS, remapping
- `custom-handlers.js` - Custom request handlers
- `docker-compose.example.yml` - Docker setup

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

## 📄 License

MIT © Robiki sp. z o.o.

## 🔗 Links

- [GitHub Repository](https://github.com/robiki-ai/robiki-proxy)
- [npm Package](https://www.npmjs.com/package/@robiki/proxy)
- [Issue Tracker](https://github.com/robiki-ai/robiki-proxy/issues)
