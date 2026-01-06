# 🚀 Robiki 代理

> 一个高性能的 HTTP/2 反向代理，支持 WebSocket、可配置路由、CORS 和请求验证。可作为 npm 包或 Docker 容器用于本地开发环境。

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 语言

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ 特性

- **🔒 HTTP/2 和 SSL/TLS 支持**：完整的 HTTP/2 协议支持，自动回退到 HTTP/1.1
- **🔌 WebSocket 代理**：无缝的 WebSocket 连接处理和代理
- **🌐 灵活路由**：按域名/主机配置路由，支持通配符
- **🛡️ CORS 管理**：全局和每个路由的 CORS 配置
- **✅ 请求验证**：用于身份验证、速率限制等的自定义验证逻辑
- **🔄 URL 重映射**：在转发到目标服务之前转换 URL
- **📦 双重用途**：可作为 npm 包或 Docker 容器使用
- **🎯 多端口支持**：同时监听多个端口
- **⚡ 高性能**：基于 Node.js 原生 HTTP/2 实现

## 📦 安装

### npm 包

```bash
npm install @robiki/proxy
# 或
yarn add @robiki/proxy
```

### Docker

```bash
docker pull robiki/proxy:latest
```

## 🚀 快速开始

### npm 包

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

创建 `proxy.config.json`：

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

创建 `docker-compose.yml`：

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

启动：

```bash
docker-compose up -d
```

## 📖 配置

### JSON 配置

简单的声明式配置：

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

### JavaScript 配置

用于高级功能，如 URL 重映射和验证：

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
      // URL 重映射
      remap: (url) => url.replace(/^\/api/, ''),
      // 请求验证
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

### TypeScript 配置

类型安全的配置，完整的 IDE 支持：

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

### 环境变量

```bash
# SSL 配置
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_ALLOW_HTTP1=true

# CORS 配置
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# 调试模式
DEBUG=true
```

## 🔧 API 参考

### `createProxy(config: ServerConfig)`

创建并启动代理服务器。

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

## 🐳 Docker 使用

挂载您的配置文件（JSON、.cjs 或 .ts）：

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

## 🔐 SSL 证书

### 开发环境（自签名）

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### 生产环境（Let's Encrypt）

```bash
certbot certonly --standalone -d example.com
```

## 🛠️ 故障排除

### 调试模式

启用详细日志记录：

```bash
DEBUG=true node your-script.js
# 或
docker run -e DEBUG=true robiki/proxy:latest
```

### 端口已被占用

```bash
lsof -ti:443 | xargs kill -9
```

## 🧪 测试

```bash
# 运行所有测试
yarn test

# 带覆盖率
yarn test:coverage

# Docker 测试
yarn test:docker
```

## 📚 示例

查看 `examples/` 目录：

- `basic-usage.js` - 简单的代理设置
- `advanced-usage.js` - 验证、CORS、重映射
- `custom-handlers.js` - 自定义请求处理器
- `docker-compose.example.yml` - Docker 设置

## 🤝 贡献

欢迎贡献！详情请参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

MIT © Robiki sp. z o.o.

## 🔗 链接

- [GitHub 仓库](https://github.com/robiki-ai/robiki-proxy)
- [npm 包](https://www.npmjs.com/package/@robiki/proxy)
- [问题跟踪](https://github.com/robiki-ai/robiki-proxy/issues)
