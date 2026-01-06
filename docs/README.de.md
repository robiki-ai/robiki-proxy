# 🚀 Robiki Proxy

> Ein leistungsstarker HTTP/2-Reverse-Proxy mit WebSocket-Unterstützung, konfigurierbarem Routing, CORS und Anforderungsvalidierung. Als npm-Paket oder Docker-Container für lokale Entwicklungsumgebungen verwendbar.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Sprachen

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ Funktionen

- **🔒 HTTP/2 & SSL/TLS-Unterstützung**: Vollständige HTTP/2-Protokollunterstützung mit automatischem HTTP/1.1-Fallback
- **🔌 WebSocket-Proxying**: Nahtlose WebSocket-Verbindungsverarbeitung und -Proxying
- **🌐 Flexibles Routing**: Routen nach Domain/Host mit Wildcard-Unterstützung konfigurieren
- **🛡️ CORS-Verwaltung**: Globale und routenspezifische CORS-Konfiguration
- **✅ Anforderungsvalidierung**: Benutzerdefinierte Validierungslogik für Authentifizierung, Rate Limiting usw.
- **🔄 URL-Remapping**: URLs vor der Weiterleitung an Zieldienste transformieren
- **📦 Duale Nutzung**: Als npm-Paket oder Docker-Container verwenden
- **⚙️ JavaScript & TypeScript-Konfigurationsunterstützung**: Verwenden Sie `.js` oder `.ts`-Konfigurationsdateien mit Funktionen in Docker
- **🎯 Multi-Port-Unterstützung**: Gleichzeitiges Lauschen auf mehreren Ports
- **⚡ Hohe Leistung**: Basiert auf der nativen HTTP/2-Implementierung von Node.js

## 📦 Installation

### npm-Paket

```bash
npm install @robiki/proxy
# oder
yarn add @robiki/proxy
```

### Docker

```bash
docker pull robiki/proxy:latest
```

## 🚀 Schnellstart

### npm-Paket

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

Erstellen Sie `proxy.config.json`:

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

Erstellen Sie `docker-compose.yml`:

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

Starten:

```bash
docker-compose up -d
```

## 📖 Konfiguration

### JSON-Konfiguration

Einfache deklarative Konfiguration:

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

### JavaScript-Konfiguration

Für erweiterte Funktionen wie URL-Remapping und Validierung:

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
      // URL-Remapping
      remap: (url) => url.replace(/^\/api/, ''),
      // Anforderungsvalidierung
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

### TypeScript-Konfiguration

Typsichere Konfiguration mit vollständiger IDE-Unterstützung:

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

### Umgebungsvariablen

```bash
# SSL-Konfiguration
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_ALLOW_HTTP1=true

# CORS-Konfiguration
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# Debug-Modus
DEBUG=true
```

## 🔧 API-Referenz

### `createProxy(config: ServerConfig)`

Erstellt und startet einen Proxy-Server.

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

## 🐳 Docker-Verwendung

Mounten Sie Ihre Konfigurationsdatei (JSON, .cjs oder .ts):

```yaml
services:
  proxy:
    image: robiki/proxy:latest
    volumes:
      - ./proxy.config.cjs:/app/proxy.config.cjs:ro
      - ./certs:/app/certs:ro
    environment:
      - PROXY_CONFIG=/app/proxy.config.cjs
```

## 🔐 SSL-Zertifikate

### Entwicklung (Self-Signed)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Produktion (Let's Encrypt)

```bash
certbot certonly --standalone -d example.com
```

## 🛠️ Fehlerbehebung

### Debug-Modus

Detaillierte Protokollierung aktivieren:

```bash
DEBUG=true node your-script.js
# oder
docker run -e DEBUG=true robiki/proxy:latest
```

### Port bereits in Verwendung

```bash
lsof -ti:443 | xargs kill -9
```

## 🧪 Tests

```bash
# Alle Tests ausführen
yarn test

# Mit Coverage
yarn test:coverage

# Docker-Tests
yarn test:docker
```

## 📚 Beispiele

Siehe das `examples/`-Verzeichnis:

- `basic-usage.js` - Einfaches Proxy-Setup
- `advanced-usage.js` - Validierung, CORS, Remapping
- `custom-handlers.js` - Benutzerdefinierte Request-Handler
- `docker-compose.example.yml` - Docker-Setup

## 🤝 Mitwirken

Beiträge willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Details.

## 📄 Lizenz

MIT © Robiki sp. z o.o.

## 🔗 Links

- [GitHub Repository](https://github.com/robiki-ai/robiki-proxy)
- [npm Package](https://www.npmjs.com/package/@robiki/proxy)
- [Issue Tracker](https://github.com/robiki-ai/robiki-proxy/issues)
