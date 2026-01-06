# 🚀 Robiki Proxy

> Wydajny reverse proxy HTTP/2 z obsługą WebSocket, konfigurowalnym routingiem, CORS i walidacją żądań. Używaj jako pakiet npm lub kontener Docker w lokalnych środowiskach deweloperskich.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Języki

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ Funkcje

- **🔒 Obsługa HTTP/2 i SSL/TLS**: Pełna obsługa protokołu HTTP/2 z automatycznym powrotem do HTTP/1.1
- **🔌 Proxy WebSocket**: Bezproblemowa obsługa i proxy połączeń WebSocket
- **🌐 Elastyczny routing**: Konfiguracja tras według domeny/hosta z obsługą wildcardów
- **🛡️ Zarządzanie CORS**: Globalna i per-trasa konfiguracja CORS
- **✅ Walidacja żądań**: Niestandardowa logika walidacji dla uwierzytelniania, limitowania żądań itp.
- **🔄 Przekierowywanie URL**: Transformacja URL przed przekazaniem do usług docelowych
- **📦 Podwójne użycie**: Użyj jako pakiet npm lub kontener Docker
- **🎯 Obsługa wielu portów**: Nasłuchiwanie na wielu portach jednocześnie
- **⚡ Wysoka wydajność**: Zbudowany na natywnej implementacji HTTP/2 w Node.js

## 📦 Instalacja

### Pakiet npm

```bash
npm install @robiki/proxy
# lub
yarn add @robiki/proxy
```

### Docker

```bash
docker pull robiki/proxy:latest
```

## 🚀 Szybki start

### Pakiet npm

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

Utwórz `proxy.config.json`:

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

Utwórz `docker-compose.yml`:

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

Uruchom:

```bash
docker-compose up -d
```

## 📖 Konfiguracja

### Konfiguracja JSON

Prosta deklaratywna konfiguracja:

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

### Konfiguracja JavaScript

Dla zaawansowanych funkcji jak przekierowywanie URL i walidacja:

```javascript
// proxy.config.cjs
module.exports = {
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
      // Przekierowywanie URL
      remap: (url) => url.replace(/^\/api/, ''),
      // Walidacja żądań
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

### Konfiguracja TypeScript

Konfiguracja z pełnym wsparciem typów i IDE:

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

### Zmienne środowiskowe

```bash
# Konfiguracja SSL
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_ALLOW_HTTP1=true

# Konfiguracja CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# Tryb debugowania
DEBUG=true
```

## 🔧 Dokumentacja API

### `createProxy(config: ServerConfig)`

Tworzy i uruchamia serwer proxy.

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

## 🐳 Użycie Docker

Zamontuj plik konfiguracyjny (JSON, .cjs lub .ts):

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

## 🔐 Certyfikaty SSL

### Środowisko deweloperskie (self-signed)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Produkcja (Let's Encrypt)

```bash
certbot certonly --standalone -d example.com
```

## 🛠️ Rozwiązywanie problemów

### Tryb debugowania

Włącz szczegółowe logowanie:

```bash
DEBUG=true node your-script.js
# lub
docker run -e DEBUG=true robiki/proxy:latest
```

### Port już w użyciu

```bash
lsof -ti:443 | xargs kill -9
```

## 🧪 Testy

```bash
# Uruchom wszystkie testy
yarn test

# Z pokryciem
yarn test:coverage

# Testy Docker
yarn test:docker
```

## 📚 Przykłady

Zobacz katalog `examples/`:

- `basic-usage.js` - Prosta konfiguracja proxy
- `advanced-usage.js` - Walidacja, CORS, przekierowania
- `custom-handlers.js` - Niestandardowe handlery żądań
- `docker-compose.example.yml` - Konfiguracja Docker

## 🤝 Współpraca

Wkład mile widziany! Zobacz [CONTRIBUTING.md](CONTRIBUTING.md) po szczegóły.

## 📄 Licencja

MIT © Robiki sp. z o.o.

## 🔗 Linki

- [Repozytorium GitHub](https://github.com/robiki-ai/robiki-proxy)
- [Pakiet npm](https://www.npmjs.com/package/@robiki/proxy)
- [Issue Tracker](https://github.com/robiki-ai/robiki-proxy/issues)
