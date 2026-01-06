# 🚀 Robiki Proxy

> Ein leistungsstarker, flexibler HTTP/2-Reverse-Proxy mit WebSocket-Unterstützung, konfigurierbarem Routing, CORS und Anforderungsvalidierung. Verwenden Sie es als npm-Paket in Ihrer Node.js-Anwendung oder als eigenständigen Docker-Container. Nur für die Verwendung als Domain-Proxy in lokalen Entwicklungsumgebungen vorgesehen.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Sprachen / Languages / 语言 / 言語 / Języki / Idiomas / Языки

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ Funktionen

- **🔒 HTTP/2 & SSL/TLS-Unterstützung**: Vollständige HTTP/2-Protokollunterstützung mit automatischem HTTP/1.1-Fallback
- **🔌 WebSocket-Proxying**: Nahtlose WebSocket-Verbindungsverarbeitung und -Proxying
- **🌐 Flexibles Routing**: Routen nach Domain/Host mit Wildcard-Unterstützung konfigurieren
- **🛡️ CORS-Verwaltung**: Globale und routenspezifische CORS-Konfiguration
- **✅ Anforderungsvalidierung**: Benutzerdefinierte Validierungslogik für Authentifizierung, Rate Limiting usw.
- **🔄 URL-Remapping**: URLs vor der Weiterleitung an Zieldienste transformieren
- **📦 Duale Nutzung**: Als npm-Paket oder Docker-Container verwenden
- **🎯 Multi-Port-Unterstützung**: Gleichzeitiges Lauschen auf mehreren Ports
- **⚡ Hohe Leistung**: Basiert auf der nativen HTTP/2-Implementierung von Node.js

## 📦 Installation

### Als npm-Paket

```bash
npm install @robiki/proxy
```

```bash
yarn add @robiki/proxy
```

### Als Docker-Container

```bash
docker pull robiki/proxy:latest
```

### Als Docker Compose Service

```yaml
services:
  proxy:
    image: robiki/proxy:latest
    container_name: robiki-proxy
    restart: unless-stopped
    ports:
      - '443:443'
      - '8080:8080'
      - '9229:9229'
    volumes:
      - ./proxy.config.json:/app/proxy.config.json:ro
      - ./certs:/app/certs:ro
    networks:
      - app-network
```

## Hinweise

- Hosts, die lokal konfiguriert sind, sollten zu Ihrer lokalen `hosts`-Datei hinzugefügt werden.
- Wenn Sie benutzerdefinierte Zertifikate verwenden, müssen Sie die Zertifikatdateien zum `certs`-Verzeichnis hinzufügen.

## 🚀 Schnellstart

### Verwendung als npm-Paket

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

console.log('Proxy-Server läuft!');
```

### Verwendung mit Docker

1. Erstellen Sie eine `proxy.config.json`-Datei:

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

2. Erstellen Sie eine `docker-compose.yml`:

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

3. Starten Sie die Dienste:

```bash
docker-compose up -d
```

## 📖 Konfiguration

### Konfigurationsdatei

Erstellen Sie eine `proxy.config.json`-Datei mit folgender Struktur:

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

### Umgebungsvariablen

Sie können den Proxy auch über Umgebungsvariablen konfigurieren:

```bash
# SSL-Konfiguration
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_CA=/app/certs/ca.pem
SSL_ALLOW_HTTP1=true

# CORS-Konfiguration
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true

# Debug-Modus
DEBUG=true  # Aktiviert detailliertes Logging für Proxy-Verbindungen und Fehler
```

## 🎯 Erweiterte Verwendung

### URL-Remapping

URLs vor der Weiterleitung an Zieldienste transformieren:

```javascript
const config = {
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      remap: (url) => {
        // /api-Präfix entfernen
        return url.replace(/^\/api/, '');
      },
    },
  },
};
```

### Anforderungsvalidierung

Benutzerdefinierte Validierungslogik für Authentifizierung, Rate Limiting usw. hinzufügen:

```javascript
const config = {
  // Globale Validierung
  validate: async (info) => {
    if (!info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: 'Nicht autorisiert',
        headers: { 'www-authenticate': 'Bearer' },
      };
    }
    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // Routenspezifische Validierung
      validate: async (info) => {
        const rateLimit = await checkRateLimit(info.remoteAddress);
        if (!rateLimit.allowed) {
          return {
            status: false,
            code: 429,
            message: 'Zu viele Anfragen',
          };
        }
        return { status: true };
      },
    },
  },
};
```

### Benutzerdefinierte CORS-Konfiguration

CORS global oder pro Route konfigurieren:

```javascript
const config = {
  // Globales CORS
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
      // Routenspezifisches CORS (überschreibt global)
      cors: {
        origin: '*',
        credentials: false,
      },
    },
  },
};
```

### Benutzerdefinierte Handler

Benutzerdefinierte Request-Handler für erweiterte Anwendungsfälle erstellen:

```javascript
import { createCustomProxy } from '@robiki/proxy';

const customRestHandler = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  // Auf Standard-Proxy-Verhalten zurückfallen
  const { restAPIProxyHandler } = await import('@robiki/proxy/connections');
  return restAPIProxyHandler(req, res);
};

const proxy = await createCustomProxy(config, {
  rest: customRestHandler,
  websocket: customWebSocketHandler,
  stream: customStreamHandler,
});
```

## 🔧 API-Referenz

### `createProxy(config: ServerConfig): Promise<ProxyServer>`

Erstellt und startet einen Proxy-Server mit der angegebenen Konfiguration.

**Parameter:**

- `config`: Server-Konfigurationsobjekt

**Rückgabe:** Promise, das zu einer `ProxyServer`-Instanz aufgelöst wird

### `ProxyServer`

**Methoden:**

- `start()`: Proxy-Server starten
- `stop()`: Proxy-Server stoppen
- `getConfig()`: Aktuelle Konfiguration abrufen

### Konfigurationstypen

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

## 🐳 Docker-Verwendung

### Verwendung in einem anderen Projekt

1. Fügen Sie den Proxy zu Ihrer `docker-compose.yml` hinzu:

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

2. Konfigurieren Sie Routen in `proxy.config.json`, um auf Ihre Dienste zu verweisen

3. Starten Sie Ihren Stack:

```bash
docker-compose up -d
```

### Benutzerdefiniertes Image erstellen

Erstellen Sie ein benutzerdefiniertes Dockerfile:

```dockerfile
FROM robiki/proxy:latest

# Kopieren Sie Ihre Konfiguration
COPY proxy.config.json /app/proxy.config.json
COPY certs /app/certs

# Umgebungsvariablen setzen
ENV PROXY_CONFIG=/app/proxy.config.json
```

## 📚 Beispiele

Weitere Verwendungsbeispiele finden Sie im Verzeichnis `examples/`:

- `basic-usage.js` - Einfache Proxy-Einrichtung
- `advanced-usage.js` - Erweiterte Funktionen (Validierung, CORS, Remapping)
- `custom-handlers.js` - Benutzerdefinierte Request-Handler
- `docker-compose.example.yml` - Vollständige Docker-Einrichtung

## 🔐 SSL/TLS-Zertifikate

### Selbstsignierte Zertifikate generieren

Für die Entwicklung:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Let's Encrypt verwenden

Für die Produktion verwenden Sie Let's Encrypt-Zertifikate:

```bash
certbot certonly --standalone -d example.com
```

Verweisen Sie dann in Ihrer Konfiguration darauf:

```json
{
  "ssl": {
    "key": "/etc/letsencrypt/live/example.com/privkey.pem",
    "cert": "/etc/letsencrypt/live/example.com/fullchain.pem"
  }
}
```

## 🤝 Mitwirken

Beiträge sind willkommen! Bitte zögern Sie nicht, einen Pull Request einzureichen.

## 📄 Lizenz

MIT © Robiki sp. z o.o.

## 🔗 Links

- [GitHub-Repository](https://github.com/robiki-ai/robiki-proxy)
- [npm-Paket](https://www.npmjs.com/package/@robiki/proxy)
- [Issue-Tracker](https://github.com/robiki-ai/robiki-proxy/issues)

## 💡 Anwendungsfälle

- **Microservices-Architektur**: Anfragen basierend auf Domain/Pfad an verschiedene Dienste weiterleiten
- **Entwicklungsumgebung**: Lokaler Proxy zum Testen mehrerer Dienste
- **API-Gateway**: Zentraler Einstiegspunkt mit Authentifizierung und Rate Limiting
- **SSL-Terminierung**: SSL/TLS auf Proxy-Ebene verarbeiten
- **CORS-Verwaltung**: Zentralisierte CORS-Konfiguration
- **Load Balancing**: Verkehr auf mehrere Instanzen verteilen (mit benutzerdefinierten Handlern)

## 🛠️ Fehlerbehebung

### Debug-Modus

Aktivieren Sie detailliertes Logging zur Fehlerbehebung bei Verbindungsproblemen:

```bash
# Debug-Modus aktivieren
DEBUG=true node your-proxy-script.js

# Oder mit Docker
docker run -e DEBUG=true robiki/proxy:latest

# Oder in docker-compose.yml
services:
  proxy:
    image: robiki/proxy:latest
    environment:
      - DEBUG=true
```

Wenn `DEBUG=true`, protokolliert der Proxy:
- Alle Proxy-Verbindungsversuche (REST, WebSocket, HTTP/2-Streams)
- Anfrage- und Antwortdetails
- Verbindungsfehler und Timeouts
- Proxy-Fehler und Client-Fehler

### Port bereits in Verwendung

Der Proxy versucht automatisch, Prozesse auf den konfigurierten Ports zu beenden. Wenn dies fehlschlägt, geben Sie die Ports manuell frei:

```bash
lsof -ti:443 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### SSL-Zertifikatfehler

Stellen Sie sicher, dass Ihre Zertifikatdateien lesbar und im richtigen Format (PEM) sind. Verwenden Sie für die Entwicklung selbstsignierte Zertifikate.

### WebSocket-Verbindungsprobleme

Stellen Sie sicher, dass Ihre WebSocket-Routen mit dem richtigen Protokoll (ws/wss) konfiguriert sind und dass der Zieldienst WebSocket-Verbindungen unterstützt.

## 🧪 Testen

Robiki Proxy enthält eine umfassende Testsuite mit Unit-Tests, Integrationstests und erweiterten Szenarien.

### Tests ausführen

```bash
# Alle Tests ausführen
yarn test

# Tests im Watch-Modus ausführen
yarn test:watch

# Tests mit Coverage ausführen
yarn test:coverage

# Tests mit UI ausführen
yarn test:ui
```

### Test-Coverage

Die Testsuite umfasst:

- **Unit-Tests**: Konfiguration, Utilities, Header-Konvertierung, CORS-Behandlung
- **Integrationstests**: HTTP-Proxying, Routenauflösung, Validierung, Config-Loading
- **Erweiterte Tests**: WebSocket-Proxying, HTTP/2-Streams, gleichzeitige Verbindungen
- **Docker-Tests**: Container-Builds, Config-Loading, Laufzeitverhalten

### Docker-Tests

Docker-Integrationstests ausführen:

```bash
# Vollständiger Docker-Integrationstest
yarn test:docker

# Config-Loading spezifisch testen
yarn test:docker:config

# Alle Tests ausführen (Unit + Integration + Docker)
yarn test:all
```

Oder mit Make:

```bash
# Schneller Docker-Build-Test
make test-docker

# Vollständige Integrationstestsuite
make test-docker-full

# Config-Loading-Test
make test-docker-config

# Docker Compose-Test
make test-docker-compose
```

Weitere Details finden Sie im [Docker Tests README](tests/docker/README.md).

## 📊 Leistung

Der Proxy basiert auf der nativen HTTP/2-Implementierung von Node.js und ist für hohe Leistung konzipiert:

- Effiziente Stream-Verarbeitung
- Minimaler Overhead
- Connection Pooling
- Automatischer HTTP/1.1-Fallback

Für Produktionsbereitstellungen berücksichtigen Sie:

- Verwendung eines Prozessmanagers (PM2, systemd)
- Aktivierung von Clustering für Multi-Core-Systeme
- Überwachung mit Health Checks
- Einrichtung eines ordnungsgemäßen Loggings

