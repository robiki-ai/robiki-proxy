# 🚀 Robiki 代理

> 一个高性能、灵活的 HTTP/2 反向代理，支持 WebSocket、可配置路由、CORS 和请求验证。可作为 npm 包在 Node.js 应用程序中使用，也可作为独立的 Docker 容器使用。仅用作本地开发环境的域名代理。

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 语言 / Languages / Sprachen / 言語 / Języki / Idiomas / Языки

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

### 作为 npm 包

```bash
npm install @robiki/proxy
```

```bash
yarn add @robiki/proxy
```

### 作为 Docker 容器

```bash
docker pull robiki/proxy:latest
```

### 作为 Docker Compose 服务

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

## 注意事项

- 本地配置的主机应添加到本地 `hosts` 文件中。
- 如果您使用自定义证书，需要将证书文件添加到 `certs` 目录。

## 🚀 快速开始

### 作为 npm 包使用

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

console.log('代理服务器正在运行！');
```

### 使用 Docker

1. 创建 `proxy.config.json` 文件：

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

2. 创建 `docker-compose.yml`：

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

3. 启动服务：

```bash
docker-compose up -d
```

## 📖 配置

### 配置文件

创建具有以下结构的 `proxy.config.json` 文件：

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

### 环境变量

您还可以使用环境变量配置代理：

```bash
# SSL 配置
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_CA=/app/certs/ca.pem
SSL_ALLOW_HTTP1=true

# CORS 配置
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true

# 调试模式
DEBUG=true  # 启用代理连接和错误的详细日志记录
```

## 🎯 高级用法

### URL 重映射

在转发到目标服务之前转换 URL：

```javascript
const config = {
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      remap: (url) => {
        // 删除 /api 前缀
        return url.replace(/^\/api/, '');
      },
    },
  },
};
```

### 请求验证

为身份验证、速率限制等添加自定义验证逻辑：

```javascript
const config = {
  // 全局验证
  validate: async (info) => {
    if (!info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: '未授权',
        headers: { 'www-authenticate': 'Bearer' },
      };
    }
    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // 路由特定验证
      validate: async (info) => {
        const rateLimit = await checkRateLimit(info.remoteAddress);
        if (!rateLimit.allowed) {
          return {
            status: false,
            code: 429,
            message: '请求过多',
          };
        }
        return { status: true };
      },
    },
  },
};
```

### 自定义 CORS 配置

全局或按路由配置 CORS：

```javascript
const config = {
  // 全局 CORS
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
      // 路由特定 CORS（覆盖全局）
      cors: {
        origin: '*',
        credentials: false,
      },
    },
  },
};
```

### 自定义处理程序

为高级用例创建自定义请求处理程序：

```javascript
import { createCustomProxy } from '@robiki/proxy';

const customRestHandler = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  // 回退到默认代理行为
  const { restAPIProxyHandler } = await import('@robiki/proxy/connections');
  return restAPIProxyHandler(req, res);
};

const proxy = await createCustomProxy(config, {
  rest: customRestHandler,
  websocket: customWebSocketHandler,
  stream: customStreamHandler,
});
```

## 🔧 API 参考

### `createProxy(config: ServerConfig): Promise<ProxyServer>`

使用给定配置创建并启动代理服务器。

**参数：**

- `config`：服务器配置对象

**返回：** 解析为 `ProxyServer` 实例的 Promise

### `ProxyServer`

**方法：**

- `start()`：启动代理服务器
- `stop()`：停止代理服务器
- `getConfig()`：获取当前配置

### 配置类型

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

## 🐳 Docker 使用

### 在另一个项目中使用

1. 将代理添加到您的 `docker-compose.yml`：

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

2. 在 `proxy.config.json` 中配置路由以指向您的服务

3. 启动您的堆栈：

```bash
docker-compose up -d
```

### 构建自定义镜像

创建自定义 Dockerfile：

```dockerfile
FROM robiki/proxy:latest

# 复制您的配置
COPY proxy.config.json /app/proxy.config.json
COPY certs /app/certs

# 设置环境变量
ENV PROXY_CONFIG=/app/proxy.config.json
```

## 📚 示例

查看 `examples/` 目录以获取更多使用示例：

- `basic-usage.js` - 简单的代理设置
- `advanced-usage.js` - 高级功能（验证、CORS、重映射）
- `custom-handlers.js` - 自定义请求处理程序
- `docker-compose.example.yml` - 完整的 Docker 设置

## 🔐 SSL/TLS 证书

### 生成自签名证书

用于开发：

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### 使用 Let's Encrypt

用于生产，使用 Let's Encrypt 证书：

```bash
certbot certonly --standalone -d example.com
```

然后在您的配置中引用它们：

```json
{
  "ssl": {
    "key": "/etc/letsencrypt/live/example.com/privkey.pem",
    "cert": "/etc/letsencrypt/live/example.com/fullchain.pem"
  }
}
```

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 📄 许可证

MIT © Robiki sp. z o.o.

## 🔗 链接

- [GitHub 仓库](https://github.com/robiki-ai/robiki-proxy)
- [npm 包](https://www.npmjs.com/package/@robiki/proxy)
- [问题跟踪器](https://github.com/robiki-ai/robiki-proxy/issues)

## 💡 用例

- **微服务架构**：根据域名/路径将请求路由到不同的服务
- **开发环境**：用于测试多个服务的本地代理
- **API 网关**：具有身份验证和速率限制的集中入口点
- **SSL 终止**：在代理级别处理 SSL/TLS
- **CORS 管理**：集中式 CORS 配置
- **负载均衡**：在多个实例之间分配流量（使用自定义处理程序）

## 🛠️ 故障排除

### 调试模式

启用详细日志记录以排除连接问题：

```bash
# 启用调试模式
DEBUG=true node your-proxy-script.js

# 或使用 Docker
docker run -e DEBUG=true robiki/proxy:latest

# 或在 docker-compose.yml 中
services:
  proxy:
    image: robiki/proxy:latest
    environment:
      - DEBUG=true
```

当 `DEBUG=true` 时，代理将记录：
- 所有代理连接尝试（REST、WebSocket、HTTP/2 流）
- 请求和响应详细信息
- 连接错误和超时
- 代理错误和客户端错误

### 端口已被占用

代理将自动尝试终止配置端口上的进程。如果失败，请手动释放端口：

```bash
lsof -ti:443 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### SSL 证书错误

确保您的证书文件可读并且格式正确（PEM）。对于开发，使用自签名证书。

### WebSocket 连接问题

确保您的 WebSocket 路由配置了正确的协议（ws/wss），并且目标服务支持 WebSocket 连接。

## 🧪 测试

Robiki Proxy 包含一个全面的测试套件，涵盖单元测试、集成测试和高级场景。

### 运行测试

```bash
# 运行所有测试
yarn test

# 在监视模式下运行测试
yarn test:watch

# 运行带覆盖率的测试
yarn test:coverage

# 使用 UI 运行测试
yarn test:ui
```

### 测试覆盖率

测试套件包括：

- **单元测试**：配置、实用程序、标头转换、CORS 处理
- **集成测试**：HTTP 代理、路由解析、验证、配置加载
- **高级测试**：WebSocket 代理、HTTP/2 流、并发连接
- **Docker 测试**：容器构建、配置加载、运行时行为

### Docker 测试

运行 Docker 集成测试：

```bash
# 完整的 Docker 集成测试
yarn test:docker

# 专门测试配置加载
yarn test:docker:config

# 运行所有测试（单元 + 集成 + Docker）
yarn test:all
```

或使用 Make：

```bash
# 快速 Docker 构建测试
make test-docker

# 完整的集成测试套件
make test-docker-full

# 配置加载测试
make test-docker-config

# Docker Compose 测试
make test-docker-compose
```

有关更多详细信息，请参阅 [Docker 测试 README](tests/docker/README.md)。

## 📊 性能

该代理基于 Node.js 原生 HTTP/2 实现，专为高性能而设计：

- 高效的流处理
- 最小的开销
- 连接池
- 自动 HTTP/1.1 回退

对于生产部署，请考虑：

- 使用进程管理器（PM2、systemd）
- 为多核系统启用集群
- 使用健康检查进行监控
- 设置适当的日志记录

