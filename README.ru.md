# 🚀 Robiki Proxy

> Высокопроизводительный обратный прокси-сервер HTTP/2 с поддержкой WebSocket, настраиваемой маршрутизацией, CORS и валидацией запросов. Используйте как npm-пакет или Docker-контейнер для локальных сред разработки.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Языки

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ Возможности

- **🔒 Поддержка HTTP/2 и SSL/TLS**: Полная поддержка протокола HTTP/2 с автоматическим откатом к HTTP/1.1
- **🔌 Прокси WebSocket**: Бесшовная обработка и проксирование WebSocket-соединений
- **🌐 Гибкая маршрутизация**: Настройка маршрутов по домену/хосту с поддержкой wildcards
- **🛡️ Управление CORS**: Глобальная и для каждого маршрута конфигурация CORS
- **✅ Валидация запросов**: Пользовательская логика валидации для аутентификации, ограничения скорости и т.д.
- **🔄 Переназначение URL**: Преобразование URL перед пересылкой к целевым сервисам
- **📦 Двойное использование**: Используйте как npm-пакет или Docker-контейнер
- **🎯 Поддержка нескольких портов**: Прослушивание нескольких портов одновременно
- **⚡ Высокая производительность**: Построен на нативной реализации HTTP/2 в Node.js

## 📦 Установка

### npm-пакет

```bash
npm install @robiki/proxy
# или
yarn add @robiki/proxy
```

### Docker

```bash
docker pull robiki/proxy:latest
```

## 🚀 Быстрый старт

### npm-пакет

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

Создайте `proxy.config.json`:

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

Создайте `docker-compose.yml`:

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

Запустите:

```bash
docker-compose up -d
```

## 📖 Конфигурация

### JSON конфигурация

Простая декларативная конфигурация:

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

### JavaScript конфигурация

Для расширенных функций, таких как переназначение URL и валидация:

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
      // Переназначение URL
      remap: (url) => url.replace(/^\/api/, ''),
      // Валидация запросов
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

### TypeScript конфигурация

Типобезопасная конфигурация с полной поддержкой IDE:

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

### Переменные окружения

```bash
# Конфигурация SSL
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_ALLOW_HTTP1=true

# Конфигурация CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# Режим отладки
DEBUG=true
```

## 🔧 Справочник API

### `createProxy(config: ServerConfig)`

Создает и запускает прокси-сервер.

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

## 🐳 Использование Docker

Смонтируйте ваш конфигурационный файл (JSON, .cjs или .ts):

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

## 🔐 SSL сертификаты

### Разработка (самоподписанные)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Продакшн (Let's Encrypt)

```bash
certbot certonly --standalone -d example.com
```

## 🛠️ Устранение неполадок

### Режим отладки

Включите подробное логирование:

```bash
DEBUG=true node your-script.js
# или
docker run -e DEBUG=true robiki/proxy:latest
```

### Порт уже используется

```bash
lsof -ti:443 | xargs kill -9
```

## 🧪 Тестирование

```bash
# Запустить все тесты
yarn test

# С покрытием
yarn test:coverage

# Docker тесты
yarn test:docker
```

## 📚 Примеры

Смотрите директорию `examples/`:

- `basic-usage.js` - Простая настройка прокси
- `advanced-usage.js` - Валидация, CORS, переназначение
- `custom-handlers.js` - Пользовательские обработчики запросов
- `docker-compose.example.yml` - Настройка Docker

## 🤝 Вклад в проект

Вклад приветствуется! Смотрите [CONTRIBUTING.md](CONTRIBUTING.md) для подробностей.

## 📄 Лицензия

MIT © Robiki sp. z o.o.

## 🔗 Ссылки

- [Репозиторий GitHub](https://github.com/robiki-ai/robiki-proxy)
- [npm пакет](https://www.npmjs.com/package/@robiki/proxy)
- [Issue Tracker](https://github.com/robiki-ai/robiki-proxy/issues)
