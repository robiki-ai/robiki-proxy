# 🚀 Robiki Proxy

> Wydajny, elastyczny reverse proxy HTTP/2 z obsługą WebSocket, konfigurowalnym routingiem, CORS i walidacją żądań. Używaj go jako pakiet npm w aplikacji Node.js lub jako samodzielny kontener Docker. Przeznaczony wyłącznie do użytku jako proxy domenowe w lokalnych środowiskach deweloperskich.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Języki / Languages / Sprachen / 语言 / 言語 / Idiomas / Языки

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

### Jako pakiet npm

```bash
npm install @robiki/proxy
```

```bash
yarn add @robiki/proxy
```

### Jako kontener Docker

```bash
docker pull robiki/proxy:latest
```

### Jako usługa Docker Compose

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

## Uwagi

- Hosty skonfigurowane lokalnie powinny zostać dodane do lokalnego pliku `hosts`.
- Jeśli używasz niestandardowych certyfikatów, musisz dodać pliki certyfikatów do katalogu `certs`.

## 🚀 Szybki start

### Użycie jako pakiet npm

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

console.log('Serwer proxy działa!');
```

### Użycie z Docker

1. Utwórz plik `proxy.config.json`:

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

2. Utwórz `docker-compose.yml`:

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

3. Uruchom usługi:

```bash
docker-compose up -d
```

## 📖 Konfiguracja

### Plik konfiguracyjny

Utwórz plik `proxy.config.json` o następującej strukturze:

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

### Zmienne środowiskowe

Możesz również skonfigurować proxy za pomocą zmiennych środowiskowych:

```bash
# Konfiguracja SSL
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_CA=/app/certs/ca.pem
SSL_ALLOW_HTTP1=true

# Konfiguracja CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true

# Tryb debugowania
DEBUG=true  # Włącz szczegółowe logowanie dla połączeń proxy i błędów
```

## 🎯 Zaawansowane użycie

### Przekierowywanie URL

Transformuj URL przed przekazaniem do usług docelowych:

```javascript
const config = {
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      remap: (url) => {
        // Usuń prefiks /api
        return url.replace(/^\/api/, '');
      },
    },
  },
};
```

### Walidacja żądań

Dodaj niestandardową logikę walidacji dla uwierzytelniania, limitowania żądań itp.:

```javascript
const config = {
  // Walidacja globalna
  validate: async (info) => {
    if (!info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: 'Nieautoryzowany',
        headers: { 'www-authenticate': 'Bearer' },
      };
    }
    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // Walidacja specyficzna dla trasy
      validate: async (info) => {
        const rateLimit = await checkRateLimit(info.remoteAddress);
        if (!rateLimit.allowed) {
          return {
            status: false,
            code: 429,
            message: 'Zbyt wiele żądań',
          };
        }
        return { status: true };
      },
    },
  },
};
```

### Niestandardowa konfiguracja CORS

Skonfiguruj CORS globalnie lub per-trasa:

```javascript
const config = {
  // Globalny CORS
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
      // CORS specyficzny dla trasy (nadpisuje globalny)
      cors: {
        origin: '*',
        credentials: false,
      },
    },
  },
};
```

### Niestandardowe handlery

Utwórz niestandardowe handlery żądań dla zaawansowanych przypadków użycia:

```javascript
import { createCustomProxy } from '@robiki/proxy';

const customRestHandler = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  // Powrót do domyślnego zachowania proxy
  const { restAPIProxyHandler } = await import('@robiki/proxy/connections');
  return restAPIProxyHandler(req, res);
};

const proxy = await createCustomProxy(config, {
  rest: customRestHandler,
  websocket: customWebSocketHandler,
  stream: customStreamHandler,
});
```

## 🔧 Dokumentacja API

### `createProxy(config: ServerConfig): Promise<ProxyServer>`

Tworzy i uruchamia serwer proxy z podaną konfiguracją.

**Parametry:**

- `config`: Obiekt konfiguracji serwera

**Zwraca:** Promise, który rozwiązuje się do instancji `ProxyServer`

### `ProxyServer`

**Metody:**

- `start()`: Uruchom serwer proxy
- `stop()`: Zatrzymaj serwer proxy
- `getConfig()`: Pobierz aktualną konfigurację

### Typy konfiguracji

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

## 🐳 Użycie Docker

### Użycie w innym projekcie

1. Dodaj proxy do swojego `docker-compose.yml`:

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

2. Skonfiguruj trasy w `proxy.config.json`, aby wskazywały na twoje usługi

3. Uruchom swój stack:

```bash
docker-compose up -d
```

### Budowanie niestandardowego obrazu

Utwórz niestandardowy Dockerfile:

```dockerfile
FROM robiki/proxy:latest

# Skopiuj swoją konfigurację
COPY proxy.config.json /app/proxy.config.json
COPY certs /app/certs

# Ustaw zmienne środowiskowe
ENV PROXY_CONFIG=/app/proxy.config.json
```

## 📚 Przykłady

Sprawdź katalog `examples/` dla więcej przykładów użycia:

- `basic-usage.js` - Prosta konfiguracja proxy
- `advanced-usage.js` - Zaawansowane funkcje (walidacja, CORS, przekierowywanie)
- `custom-handlers.js` - Niestandardowe handlery żądań
- `docker-compose.example.yml` - Pełna konfiguracja Docker

## 🔐 Certyfikaty SSL/TLS

### Generowanie certyfikatów self-signed

Do rozwoju:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Użycie Let's Encrypt

Do produkcji, użyj certyfikatów Let's Encrypt:

```bash
certbot certonly --standalone -d example.com
```

Następnie odwołaj się do nich w konfiguracji:

```json
{
  "ssl": {
    "key": "/etc/letsencrypt/live/example.com/privkey.pem",
    "cert": "/etc/letsencrypt/live/example.com/fullchain.pem"
  }
}
```

## 🤝 Współpraca

Wkłady są mile widziane! Prosimy o przesyłanie Pull Requestów.

## 📄 Licencja

MIT © Robiki sp. z o.o.

## 🔗 Linki

- [Repozytorium GitHub](https://github.com/robiki-ai/robiki-proxy)
- [Pakiet npm](https://www.npmjs.com/package/@robiki/proxy)
- [Tracker problemów](https://github.com/robiki-ai/robiki-proxy/issues)

## 💡 Przypadki użycia

- **Architektura mikroserwisów**: Kierowanie żądań do różnych usług na podstawie domeny/ścieżki
- **Środowisko deweloperskie**: Lokalny proxy do testowania wielu usług
- **Brama API**: Scentralizowany punkt wejścia z uwierzytelnianiem i limitowaniem żądań
- **Terminacja SSL**: Obsługa SSL/TLS na poziomie proxy
- **Zarządzanie CORS**: Scentralizowana konfiguracja CORS
- **Równoważenie obciążenia**: Dystrybucja ruchu między wieloma instancjami (z niestandardowymi handlerami)

## 🛠️ Rozwiązywanie problemów

### Tryb debugowania

Włącz szczegółowe logowanie, aby rozwiązać problemy z połączeniem:

```bash
# Włącz tryb debugowania
DEBUG=true node your-proxy-script.js

# Lub z Docker
docker run -e DEBUG=true robiki/proxy:latest

# Lub w docker-compose.yml
services:
  proxy:
    image: robiki/proxy:latest
    environment:
      - DEBUG=true
```

Gdy `DEBUG=true`, proxy będzie logować:
- Wszystkie próby połączenia proxy (REST, WebSocket, strumienie HTTP/2)
- Szczegóły żądań i odpowiedzi
- Błędy połączenia i przekroczenia czasu
- Błędy proxy i błędy klienta

### Port już w użyciu

Proxy automatycznie spróbuje zabić procesy na skonfigurowanych portach. Jeśli to się nie powiedzie, ręcznie zwolnij porty:

```bash
lsof -ti:443 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### Błędy certyfikatu SSL

Upewnij się, że pliki certyfikatów są czytelne i w poprawnym formacie (PEM). Do rozwoju użyj certyfikatów self-signed.

### Problemy z połączeniem WebSocket

Upewnij się, że trasy WebSocket są skonfigurowane z poprawnym protokołem (ws/wss) i że usługa docelowa obsługuje połączenia WebSocket.

## 🧪 Testowanie

Robiki Proxy zawiera kompleksowy zestaw testów obejmujący testy jednostkowe, testy integracyjne i zaawansowane scenariusze.

### Uruchamianie testów

```bash
# Uruchom wszystkie testy
yarn test

# Uruchom testy w trybie watch
yarn test:watch

# Uruchom testy z pokryciem
yarn test:coverage

# Uruchom testy z UI
yarn test:ui
```

### Pokrycie testów

Zestaw testów obejmuje:

- **Testy jednostkowe**: Konfiguracja, narzędzia, konwersja nagłówków, obsługa CORS
- **Testy integracyjne**: Proxy HTTP, rozwiązywanie tras, walidacja, ładowanie konfiguracji
- **Testy zaawansowane**: Proxy WebSocket, strumienie HTTP/2, równoczesne połączenia
- **Testy Docker**: Budowanie kontenerów, ładowanie konfiguracji, zachowanie w czasie wykonywania

### Testy Docker

Uruchom testy integracyjne Docker:

```bash
# Pełny test integracyjny Docker
yarn test:docker

# Test specyficzny dla ładowania konfiguracji
yarn test:docker:config

# Uruchom wszystkie testy (jednostkowe + integracyjne + Docker)
yarn test:all
```

Lub używając Make:

```bash
# Szybki test budowania Docker
make test-docker

# Pełny zestaw testów integracyjnych
make test-docker-full

# Test ładowania konfiguracji
make test-docker-config

# Test Docker Compose
make test-docker-compose
```

Zobacz [Docker Tests README](tests/docker/README.md) dla więcej szczegółów.

## 📊 Wydajność

Proxy jest zbudowany na natywnej implementacji HTTP/2 w Node.js i zaprojektowany z myślą o wysokiej wydajności:

- Efektywna obsługa strumieni
- Minimalny narzut
- Pooling połączeń
- Automatyczny powrót do HTTP/1.1

Dla wdrożeń produkcyjnych rozważ:

- Użycie menedżera procesów (PM2, systemd)
- Włączenie klastrowania dla systemów wielordzeniowych
- Monitorowanie za pomocą health checks
- Skonfigurowanie odpowiedniego logowania

