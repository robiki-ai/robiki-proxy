# 🚀 Robiki プロキシ

> WebSocket サポート、設定可能なルーティング、CORS、リクエスト検証を備えた高性能な HTTP/2 リバースプロキシ。npm パッケージまたは Docker コンテナとしてローカル開発環境で使用できます。

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 言語

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ 機能

- **🔒 HTTP/2 & SSL/TLS サポート**：完全な HTTP/2 プロトコルサポートと自動 HTTP/1.1 フォールバック
- **🔌 WebSocket プロキシ**：シームレスな WebSocket 接続処理とプロキシ
- **🌐 柔軟なルーティング**：ワイルドカードサポート付きのドメイン/ホスト別ルート設定
- **🛡️ CORS 管理**：グローバルおよびルート別の CORS 設定
- **✅ リクエスト検証**：認証、レート制限などのカスタム検証ロジック
- **🔄 URL リマッピング**：ターゲットサービスに転送する前に URL を変換
- **📦 デュアル使用**：npm パッケージまたは Docker コンテナとして使用
- **⚙️ JavaScript & TypeScript 設定サポート**：Docker で関数を使用した `.js` または `.ts` 設定ファイルを使用
- **🎯 マルチポートサポート**：複数のポートで同時にリッスン
- **⚡ 高性能**：Node.js ネイティブ HTTP/2 実装に基づく

## 📦 インストール

### npm パッケージ

```bash
npm install @robiki/proxy
# または
yarn add @robiki/proxy
```

### Docker

```bash
docker pull robiki/proxy:latest
```

## 🚀 クイックスタート

### npm パッケージ

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

`proxy.config.json` を作成：

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

`docker-compose.yml` を作成：

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

起動：

```bash
docker-compose up -d
```

## 📖 設定

### JSON 設定

シンプルな宣言的設定：

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

### JavaScript 設定

URL リマッピングや検証などの高度な機能用：

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
      // URL リマッピング
      remap: (url) => url.replace(/^\/api/, ''),
      // リクエスト検証
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

### TypeScript 設定

完全な IDE サポート付きの型安全な設定：

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

### 環境変数

```bash
# SSL 設定
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_ALLOW_HTTP1=true

# CORS 設定
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE
CORS_CREDENTIALS=true

# デバッグモード
DEBUG=true
```

## 🔧 API リファレンス

### `createProxy(config: ServerConfig)`

プロキシサーバーを作成して起動します。

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

設定ファイル（JSON、.cjs、または .ts）をマウント：

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

## 🔐 SSL 証明書

### 開発環境（自己署名）

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### 本番環境（Let's Encrypt）

```bash
certbot certonly --standalone -d example.com
```

## 🛠️ トラブルシューティング

### デバッグモード

詳細なログを有効化：

```bash
DEBUG=true node your-script.js
# または
docker run -e DEBUG=true robiki/proxy:latest
```

### ポートが既に使用中

```bash
lsof -ti:443 | xargs kill -9
```

## 🧪 テスト

```bash
# すべてのテストを実行
yarn test

# カバレッジ付き
yarn test:coverage

# Docker テスト
yarn test:docker
```

## 📚 例

`examples/` ディレクトリを参照：

- `basic-usage.js` - シンプルなプロキシ設定
- `advanced-usage.js` - 検証、CORS、リマッピング
- `custom-handlers.js` - カスタムリクエストハンドラ
- `docker-compose.example.yml` - Docker 設定

## 🤝 貢献

貢献を歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 📄 ライセンス

MIT © Robiki sp. z o.o.

## 🔗 リンク

- [GitHub リポジトリ](https://github.com/robiki-ai/robiki-proxy)
- [npm パッケージ](https://www.npmjs.com/package/@robiki/proxy)
- [Issue トラッカー](https://github.com/robiki-ai/robiki-proxy/issues)
