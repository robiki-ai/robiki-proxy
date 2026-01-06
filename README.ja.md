# 🚀 Robiki プロキシ

> WebSocket サポート、設定可能なルーティング、CORS、リクエスト検証を備えた高性能で柔軟な HTTP/2 リバースプロキシ。Node.js アプリケーションの npm パッケージとして、またはスタンドアロンの Docker コンテナとして使用できます。ローカル開発環境専用のドメインプロキシとしての使用を想定しています。

[![npm version](https://img.shields.io/npm/v/@robiki/proxy.svg)](https://www.npmjs.com/package/@robiki/proxy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌍 言語 / Languages / Sprachen / 语言 / Języki / Idiomas / Языки

[English](README.md) | [Deutsch](README.de.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Polski](README.pl.md) | [Español](README.es.md) | [Русский](README.ru.md)

## ✨ 機能

- **🔒 HTTP/2 & SSL/TLS サポート**：完全な HTTP/2 プロトコルサポートと自動 HTTP/1.1 フォールバック
- **🔌 WebSocket プロキシ**：シームレスな WebSocket 接続処理とプロキシ
- **🌐 柔軟なルーティング**：ワイルドカードサポート付きのドメイン/ホスト別ルート設定
- **🛡️ CORS 管理**：グローバルおよびルート別の CORS 設定
- **✅ リクエスト検証**：認証、レート制限などのカスタム検証ロジック
- **🔄 URL リマッピング**：ターゲットサービスに転送する前に URL を変換
- **📦 デュアル使用**：npm パッケージまたは Docker コンテナとして使用
- **🎯 マルチポートサポート**：複数のポートで同時にリッスン
- **⚡ 高性能**：Node.js ネイティブ HTTP/2 実装に基づく

## 📦 インストール

### npm パッケージとして

```bash
npm install @robiki/proxy
```

```bash
yarn add @robiki/proxy
```

### Docker コンテナとして

```bash
docker pull robiki/proxy:latest
```

### Docker Compose サービスとして

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

## 注意事項

- ローカルで設定されたホストは、ローカルの `hosts` ファイルに追加する必要があります。
- カスタム証明書を使用する場合は、証明書ファイルを `certs` ディレクトリに追加する必要があります。

## 🚀 クイックスタート

### npm パッケージとして使用

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

console.log('プロキシサーバーが実行中です！');
```

### Docker で使用

1. `proxy.config.json` ファイルを作成：

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

2. `docker-compose.yml` を作成：

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

3. サービスを起動：

```bash
docker-compose up -d
```

## 📖 設定

### 設定ファイル

次の構造で `proxy.config.json` ファイルを作成：

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

### 環境変数

環境変数を使用してプロキシを設定することもできます：

```bash
# SSL 設定
SSL_KEY=/app/certs/key.pem
SSL_CERT=/app/certs/cert.pem
SSL_CA=/app/certs/ca.pem
SSL_ALLOW_HTTP1=true

# CORS 設定
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_HEADERS=Content-Type,Authorization
CORS_CREDENTIALS=true

# デバッグモード
DEBUG=true  # プロキシ接続とエラーの詳細なログを有効にする
```

## 🎯 高度な使用法

### URL リマッピング

ターゲットサービスに転送する前に URL を変換：

```javascript
const config = {
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      remap: (url) => {
        // /api プレフィックスを削除
        return url.replace(/^\/api/, '');
      },
    },
  },
};
```

### リクエスト検証

認証、レート制限などのカスタム検証ロジックを追加：

```javascript
const config = {
  // グローバル検証
  validate: async (info) => {
    if (!info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: '認証されていません',
        headers: { 'www-authenticate': 'Bearer' },
      };
    }
    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      ssl: true,
      // ルート固有の検証
      validate: async (info) => {
        const rateLimit = await checkRateLimit(info.remoteAddress);
        if (!rateLimit.allowed) {
          return {
            status: false,
            code: 429,
            message: 'リクエストが多すぎます',
          };
        }
        return { status: true };
      },
    },
  },
};
```

### カスタム CORS 設定

CORS をグローバルまたはルート別に設定：

```javascript
const config = {
  // グローバル CORS
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
      // ルート固有の CORS（グローバルを上書き）
      cors: {
        origin: '*',
        credentials: false,
      },
    },
  },
};
```

### カスタムハンドラー

高度なユースケース用のカスタムリクエストハンドラーを作成：

```javascript
import { createCustomProxy } from '@robiki/proxy';

const customRestHandler = async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }
  // デフォルトのプロキシ動作にフォールバック
  const { restAPIProxyHandler } = await import('@robiki/proxy/connections');
  return restAPIProxyHandler(req, res);
};

const proxy = await createCustomProxy(config, {
  rest: customRestHandler,
  websocket: customWebSocketHandler,
  stream: customStreamHandler,
});
```

## 🔧 API リファレンス

### `createProxy(config: ServerConfig): Promise<ProxyServer>`

指定された設定でプロキシサーバーを作成して起動します。

**パラメータ：**

- `config`：サーバー設定オブジェクト

**戻り値：** `ProxyServer` インスタンスに解決される Promise

### `ProxyServer`

**メソッド：**

- `start()`：プロキシサーバーを起動
- `stop()`：プロキシサーバーを停止
- `getConfig()`：現在の設定を取得

### 設定タイプ

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

## 🐳 Docker の使用

### 別のプロジェクトで使用

1. `docker-compose.yml` にプロキシを追加：

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

2. `proxy.config.json` でサービスを指すようにルートを設定

3. スタックを起動：

```bash
docker-compose up -d
```

### カスタムイメージのビルド

カスタム Dockerfile を作成：

```dockerfile
FROM robiki/proxy:latest

# 設定をコピー
COPY proxy.config.json /app/proxy.config.json
COPY certs /app/certs

# 環境変数を設定
ENV PROXY_CONFIG=/app/proxy.config.json
```

## 📚 例

より多くの使用例については、`examples/` ディレクトリを確認してください：

- `basic-usage.js` - シンプルなプロキシ設定
- `advanced-usage.js` - 高度な機能（検証、CORS、リマッピング）
- `custom-handlers.js` - カスタムリクエストハンドラー
- `docker-compose.example.yml` - 完全な Docker 設定

## 🔐 SSL/TLS 証明書

### 自己署名証明書の生成

開発用：

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

### Let's Encrypt の使用

本番環境では、Let's Encrypt 証明書を使用：

```bash
certbot certonly --standalone -d example.com
```

次に、設定で参照：

```json
{
  "ssl": {
    "key": "/etc/letsencrypt/live/example.com/privkey.pem",
    "cert": "/etc/letsencrypt/live/example.com/fullchain.pem"
  }
}
```

## 🤝 貢献

貢献を歓迎します！お気軽にプルリクエストを送信してください。

## 📄 ライセンス

MIT © Robiki sp. z o.o.

## 🔗 リンク

- [GitHub リポジトリ](https://github.com/robiki-ai/robiki-proxy)
- [npm パッケージ](https://www.npmjs.com/package/@robiki/proxy)
- [イシュートラッカー](https://github.com/robiki-ai/robiki-proxy/issues)

## 💡 ユースケース

- **マイクロサービスアーキテクチャ**：ドメイン/パスに基づいて異なるサービスにリクエストをルーティング
- **開発環境**：複数のサービスをテストするためのローカルプロキシ
- **API ゲートウェイ**：認証とレート制限を備えた集中エントリポイント
- **SSL ターミネーション**：プロキシレベルで SSL/TLS を処理
- **CORS 管理**：集中型 CORS 設定
- **ロードバランシング**：複数のインスタンスにトラフィックを分散（カスタムハンドラーを使用）

## 🛠️ トラブルシューティング

### デバッグモード

接続の問題をトラブルシューティングするために詳細なログを有効にする：

```bash
# デバッグモードを有効にする
DEBUG=true node your-proxy-script.js

# または Docker で
docker run -e DEBUG=true robiki/proxy:latest

# または docker-compose.yml で
services:
  proxy:
    image: robiki/proxy:latest
    environment:
      - DEBUG=true
```

`DEBUG=true` の場合、プロキシは以下をログに記録します：
- すべてのプロキシ接続試行（REST、WebSocket、HTTP/2 ストリーム）
- リクエストとレスポンスの詳細
- 接続エラーとタイムアウト
- プロキシエラーとクライアントエラー

### ポートが既に使用中

プロキシは、設定されたポートのプロセスを自動的に終了しようとします。失敗した場合は、手動でポートを解放：

```bash
lsof -ti:443 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

### SSL 証明書エラー

証明書ファイルが読み取り可能で、正しい形式（PEM）であることを確認してください。開発では、自己署名証明書を使用します。

### WebSocket 接続の問題

WebSocket ルートが正しいプロトコル（ws/wss）で設定されており、ターゲットサービスが WebSocket 接続をサポートしていることを確認してください。

## 🧪 テスト

Robiki Proxy には、ユニットテスト、統合テスト、高度なシナリオをカバーする包括的なテストスイートが含まれています。

### テストの実行

```bash
# すべてのテストを実行
yarn test

# ウォッチモードでテストを実行
yarn test:watch

# カバレッジ付きでテストを実行
yarn test:coverage

# UI でテストを実行
yarn test:ui
```

### テストカバレッジ

テストスイートには以下が含まれます：

- **ユニットテスト**：設定、ユーティリティ、ヘッダー変換、CORS 処理
- **統合テスト**：HTTP プロキシ、ルート解決、検証、設定読み込み
- **高度なテスト**：WebSocket プロキシ、HTTP/2 ストリーム、同時接続
- **Docker テスト**：コンテナビルド、設定読み込み、ランタイム動作

### Docker テスト

Docker 統合テストを実行：

```bash
# 完全な Docker 統合テスト
yarn test:docker

# 設定読み込みを特にテスト
yarn test:docker:config

# すべてのテストを実行（ユニット + 統合 + Docker）
yarn test:all
```

または Make を使用：

```bash
# クイック Docker ビルドテスト
make test-docker

# 完全な統合テストスイート
make test-docker-full

# 設定読み込みテスト
make test-docker-config

# Docker Compose テスト
make test-docker-compose
```

詳細については、[Docker テスト README](tests/docker/README.md) を参照してください。

## 📊 パフォーマンス

このプロキシは Node.js ネイティブ HTTP/2 実装に基づいており、高性能向けに設計されています：

- 効率的なストリーム処理
- 最小限のオーバーヘッド
- コネクションプーリング
- 自動 HTTP/1.1 フォールバック

本番環境デプロイメントでは、以下を検討してください：

- プロセスマネージャーの使用（PM2、systemd）
- マルチコアシステム用のクラスタリングの有効化
- ヘルスチェックによる監視
- 適切なログ記録の設定

