# 🚀 Robiki Proxy

> Un proxy inverso HTTP/2 de alto rendimiento con soporte WebSocket, enrutamiento configurable, CORS y validación de solicitudes. Úsalo como paquete npm o contenedor Docker para entornos de desarrollo local.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Idiomas

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ Características

- **🔒 Soporte HTTP/2 y SSL/TLS**: Soporte completo del protocolo HTTP/2 con respaldo automático a HTTP/1.1
- **🔌 Proxy WebSocket**: Manejo y proxy de conexiones WebSocket sin problemas
- **🌐 Enrutamiento flexible**: Configura rutas por dominio/host con soporte de comodines
- **🛡️ Gestión CORS**: Configuración CORS global y por ruta
- **✅ Validación de solicitudes**: Lógica de validación personalizada para autenticación, limitación de velocidad, etc.
- **🔄 Remapeo de URL**: Transforma URLs antes de reenviarlas a servicios de destino
- **📦 Uso dual**: Usa como paquete npm o contenedor Docker
- **🎯 Soporte multi-puerto**: Escucha en múltiples puertos simultáneamente
- **⚡ Alto rendimiento**: Construido sobre la implementación nativa HTTP/2 de Node.js

## 📦 Instalación

### Paquete npm

```bash
npm install @robiki/proxy
# o
yarn add @robiki/proxy
```

### Docker

```bash
docker pull robiki/proxy:latest
```

## 🚀 Inicio rápido

### Paquete npm

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

Crea `proxy.config.json`:

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

Crea `docker-compose.yml`:

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

Inicia:

```bash
docker-compose up -d
```

## 📖 Configuración

### Configuración JSON

Configuración declarativa simple:

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

### Configuración JavaScript

Para características avanzadas como remapeo de URL y validación:

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
      // Remapeo de URL
      remap: (url) => url.replace(/^\/api/, ''),
      // Validación de solicitudes
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

### Configuración TypeScript

Configuración con tipos seguros y soporte completo de IDE:

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

### Variables de entorno

```bash
# Configuración SSL
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_ALLOW_HTTP1=true

# Configuración CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# Modo de depuración
DEBUG=true
```

## 🔧 Referencia de API

### `createProxy(config: ServerConfig)`

Crea e inicia un servidor proxy.

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

## 🐳 Uso de Docker

Monta tu archivo de configuración (JSON, .cjs o .ts):

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

## 🔐 Certificados SSL

### Desarrollo (autofirmados)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Producción (Let's Encrypt)

```bash
certbot certonly --standalone -d example.com
```

## 🛠️ Solución de problemas

### Modo de depuración

Habilita el registro detallado:

```bash
DEBUG=true node your-script.js
# o
docker run -e DEBUG=true robiki/proxy:latest
```

### Puerto ya en uso

```bash
lsof -ti:443 | xargs kill -9
```

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas
yarn test

# Con cobertura
yarn test:coverage

# Pruebas Docker
yarn test:docker
```

## 📚 Ejemplos

Consulta el directorio `examples/`:

- `basic-usage.js` - Configuración simple de proxy
- `advanced-usage.js` - Validación, CORS, remapeo
- `custom-handlers.js` - Manejadores de solicitudes personalizados
- `docker-compose.example.yml` - Configuración Docker

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

## 📄 Licencia

MIT © Robiki sp. z o.o.

## 🔗 Enlaces

- [Repositorio GitHub](https://github.com/robiki-ai/robiki-proxy)
- [Paquete npm](https://www.npmjs.com/package/@robiki/proxy)
- [Rastreador de problemas](https://github.com/robiki-ai/robiki-proxy/issues)
