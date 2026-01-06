# 🚀 Robiki Proxy

> Un proxy inverso HTTP/2 de alto rendimiento y flexible con soporte WebSocket, enrutamiento configurable, CORS y validación de solicitudes. Úsalo como paquete npm en tu aplicación Node.js o como contenedor Docker independiente. Destinado a ser utilizado únicamente como proxy de dominio para entornos de desarrollo local.

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 Idiomas / Languages / Sprachen / 语言 / 言語 / Języki / Языки

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

### Como paquete npm

```bash
npm install @robiki/proxy
```

```bash
yarn add @robiki/proxy
```

### Como contenedor Docker

```bash
docker pull robiki/proxy:latest
```

### Como servicio Docker Compose

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

## Notas

- Los hosts configurados localmente deben agregarse a su archivo `hosts` local.
- Si está utilizando certificados personalizados, debe agregar los archivos de certificado al directorio `certs`.

## 🚀 Inicio rápido

### Uso como paquete npm

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

console.log('¡El servidor proxy está funcionando!');
```

### Uso con Docker

1. Crea un archivo `proxy.config.json`:

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

2. Crea un `docker-compose.yml`:

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

3. Inicia los servicios:

```bash
docker-compose up -d
```

## 📖 Configuración

### Archivo de configuración

Crea un archivo `proxy.config.json` con la siguiente estructura:

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

### Variables de entorno

También puedes configurar el proxy usando variables de entorno:

```bash
# Configuración SSL
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_CA=/app/certs/ca.pem
SSL_ALLOW_HTTP1=true

# Configuración CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true

# Modo de depuración
DEBUG=true  # Habilita el registro detallado para conexiones proxy y errores
```

## 🎯 Uso avanzado

### Remapeo de URL

Transforma URLs antes de reenviarlas a servicios de destino:

```javascript
const config = {
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      remap: (url) => {
        // Eliminar prefijo /api
        return url.replace(/^\/api/, '');
      },
    },
  },
};
```

### Validación de solicitudes

Agrega lógica de validación personalizada para autenticación, limitación de velocidad, etc.:

```javascript
const config = {
  // Validación global
  validate: async (info) => {
    if (!info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: 'No autorizado',
        headers: { 'www-authenticate': 'Bearer' },
      };
    }
    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // Validación específica de ruta
      validate: async (info) => {
        const rateLimit = await checkRateLimit(info.remoteAddress);
        if (!rateLimit.allowed) {
          return {
            status: false,
            code: 429,
            message: 'Demasiadas solicitudes',
          };
        }
        return { status: true };
      },
    },
  },
};
```

### Configuración CORS personalizada

Configura CORS globalmente o por ruta:

```javascript
const config = {
  // CORS global
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
      // CORS específico de ruta (sobrescribe global)
      cors: {
        origin: '*',
        credentials: false,
      },
    },
  },
};
```

### Manejadores personalizados

Crea manejadores de solicitudes personalizados para casos de uso avanzados:

```javascript
import { createCustomProxy } from '@robiki/proxy';

const customRestHandler = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  // Volver al comportamiento de proxy predeterminado
  const { restAPIProxyHandler } = await import('@robiki/proxy/connections');
  return restAPIProxyHandler(req, res);
};

const proxy = await createCustomProxy(config, {
  rest: customRestHandler,
  websocket: customWebSocketHandler,
  stream: customStreamHandler,
});
```

## 🔧 Referencia de API

### `createProxy(config: ServerConfig): Promise<ProxyServer>`

Crea e inicia un servidor proxy con la configuración dada.

**Parámetros:**

- `config`: Objeto de configuración del servidor

**Retorna:** Promise que se resuelve en una instancia de `ProxyServer`

### `ProxyServer`

**Métodos:**

- `start()`: Iniciar el servidor proxy
- `stop()`: Detener el servidor proxy
- `getConfig()`: Obtener la configuración actual

### Tipos de configuración

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

## 🐳 Uso de Docker

### Uso en otro proyecto

1. Agrega el proxy a tu `docker-compose.yml`:

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

2. Configura rutas en `proxy.config.json` para apuntar a tus servicios

3. Inicia tu stack:

```bash
docker-compose up -d
```

### Construir imagen personalizada

Crea un Dockerfile personalizado:

```dockerfile
FROM robiki/proxy:latest

# Copia tu configuración
COPY proxy.config.json /app/proxy.config.json
COPY certs /app/certs

# Establece variables de entorno
ENV PROXY_CONFIG=/app/proxy.config.json
```

## 📚 Ejemplos

Consulta el directorio `examples/` para más ejemplos de uso:

- `basic-usage.js` - Configuración simple de proxy
- `advanced-usage.js` - Características avanzadas (validación, CORS, remapeo)
- `custom-handlers.js` - Manejadores de solicitudes personalizados
- `docker-compose.example.yml` - Configuración completa de Docker

## 🔐 Certificados SSL/TLS

### Generar certificados autofirmados

Para desarrollo:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Usar Let's Encrypt

Para producción, usa certificados Let's Encrypt:

```bash
certbot certonly --standalone -d example.com
```

Luego refiérelos en tu configuración:

```json
{
  "ssl": {
    "key": "/etc/letsencrypt/live/example.com/privkey.pem",
    "cert": "/etc/letsencrypt/live/example.com/fullchain.pem"
  }
}
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! No dudes en enviar un Pull Request.

## 📄 Licencia

MIT © Robiki sp. z o.o.

## 🔗 Enlaces

- [Repositorio GitHub](https://github.com/robiki-ai/robiki-proxy)
- [Paquete npm](https://www.npmjs.com/package/@robiki/proxy)
- [Rastreador de problemas](https://github.com/robiki-ai/robiki-proxy/issues)

## 💡 Casos de uso

- **Arquitectura de microservicios**: Enrutar solicitudes a diferentes servicios según dominio/ruta
- **Entorno de desarrollo**: Proxy local para probar múltiples servicios
- **API Gateway**: Punto de entrada centralizado con autenticación y limitación de velocidad
- **Terminación SSL**: Manejar SSL/TLS a nivel de proxy
- **Gestión CORS**: Configuración CORS centralizada
- **Balanceo de carga**: Distribuir tráfico entre múltiples instancias (con manejadores personalizados)

## 🛠️ Solución de problemas

### Modo de depuración

Habilita el registro detallado para solucionar problemas de conexión:

```bash
# Habilitar modo de depuración
DEBUG=true node your-proxy-script.js

# O con Docker
docker run -e DEBUG=true robiki/proxy:latest

# O en docker-compose.yml
services:
  proxy:
    image: robiki/proxy:latest
    environment:
      - DEBUG=true
```

Cuando `DEBUG=true`, el proxy registrará:
- Todos los intentos de conexión proxy (REST, WebSocket, flujos HTTP/2)
- Detalles de solicitudes y respuestas
- Errores de conexión y tiempos de espera
- Errores de proxy y errores de cliente

### Puerto ya en uso

El proxy intentará automáticamente matar procesos en los puertos configurados. Si esto falla, libera los puertos manualmente:

```bash
lsof -ti:443 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### Errores de certificado SSL

Asegúrate de que tus archivos de certificado sean legibles y estén en el formato correcto (PEM). Para desarrollo, usa certificados autofirmados.

### Problemas de conexión WebSocket

Asegúrate de que tus rutas WebSocket estén configuradas con el protocolo correcto (ws/wss) y que el servicio de destino admita conexiones WebSocket.

## 🧪 Pruebas

Robiki Proxy incluye un conjunto completo de pruebas que cubre pruebas unitarias, pruebas de integración y escenarios avanzados.

### Ejecutar pruebas

```bash
# Ejecutar todas las pruebas
yarn test

# Ejecutar pruebas en modo watch
yarn test:watch

# Ejecutar pruebas con cobertura
yarn test:coverage

# Ejecutar pruebas con UI
yarn test:ui
```

### Cobertura de pruebas

El conjunto de pruebas incluye:

- **Pruebas unitarias**: Configuración, utilidades, conversión de encabezados, manejo CORS
- **Pruebas de integración**: Proxy HTTP, resolución de rutas, validación, carga de configuración
- **Pruebas avanzadas**: Proxy WebSocket, flujos HTTP/2, conexiones concurrentes
- **Pruebas Docker**: Construcción de contenedores, carga de configuración, comportamiento en tiempo de ejecución

### Pruebas Docker

Ejecutar pruebas de integración Docker:

```bash
# Prueba completa de integración Docker
yarn test:docker

# Probar carga de configuración específicamente
yarn test:docker:config

# Ejecutar todas las pruebas (unitarias + integración + Docker)
yarn test:all
```

O usando Make:

```bash
# Prueba rápida de construcción Docker
make test-docker

# Suite completa de pruebas de integración
make test-docker-full

# Prueba de carga de configuración
make test-docker-config

# Prueba Docker Compose
make test-docker-compose
```

Consulta el [README de pruebas Docker](tests/docker/README.md) para más detalles.

## 📊 Rendimiento

El proxy está construido sobre la implementación nativa HTTP/2 de Node.js y está diseñado para alto rendimiento:

- Manejo eficiente de flujos
- Sobrecarga mínima
- Agrupación de conexiones
- Respaldo automático a HTTP/1.1

Para implementaciones de producción, considera:

- Usar un gestor de procesos (PM2, systemd)
- Habilitar clustering para sistemas multi-núcleo
- Monitoreo con health checks
- Configurar registro adecuado

