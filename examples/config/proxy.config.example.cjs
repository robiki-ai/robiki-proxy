/**
 * Example JavaScript configuration file for Robiki Proxy
 * 
 * This file demonstrates how to use JavaScript functions in your proxy configuration
 * when running the proxy in Docker. Unlike JSON config files, JS files support:
 * - remap() functions for URL transformation
 * - validate() functions for custom request validation
 * - Dynamic configuration based on environment variables
 * 
 * To use this config with Docker:
 * 1. Mount this file: -v ./proxy.config.js:/usr/src/proxy.config.js
 * 2. Set environment: -e PROXY_CONFIG=/usr/src/proxy.config.js
 */

module.exports = {
  ssl: {
    key: process.env.SSL_KEY || './certs/key.pem',
    cert: process.env.SSL_CERT || './certs/cert.pem',
    ca: process.env.SSL_CA || './certs/ca.pem',
    allowHTTP1: true,
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    credentials: true,
    maxAge: 86400,
  },
  // Global validation function
  validate: async (info) => {
    // Example: Log all requests
    console.log(`[${new Date().toISOString()}] ${info.method} ${info.path} from ${info.remoteAddress}`);
    
    // Example: Block specific IPs
    const blockedIPs = ['192.168.1.100', '10.0.0.50'];
    if (blockedIPs.includes(info.remoteAddress)) {
      return {
        status: false,
        code: 403,
        message: 'Forbidden',
      };
    }
    
    // Example: Require authentication for certain paths
    if (info.path.startsWith('/admin') && !info.headers.authorization) {
      return {
        status: false,
        code: 401,
        message: 'Unauthorized',
        headers: {
          'www-authenticate': 'Bearer',
        },
      };
    }
    
    return { status: true };
  },
  routes: {
    'api.example.com': {
      target: 'backend-service:3000',
      ssl: true,
      cors: {
        origin: ['https://example.com', 'https://www.example.com'],
        credentials: true,
      },
      // URL remapping function
      remap: (url) => {
        // Remove /api prefix before forwarding
        if (url.startsWith('/api')) {
          return url.replace(/^\/api/, '');
        }
        return url;
      },
      // Route-specific validation
      validate: async (info) => {
        // Example: Rate limiting (simplified)
        const rateLimitKey = `rate:${info.remoteAddress}`;
        // In production, use Redis or similar for rate limiting
        
        // Example: Check API key
        const apiKey = info.headers['x-api-key'];
        if (!apiKey || apiKey !== process.env.API_KEY) {
          return {
            status: false,
            code: 401,
            message: 'Invalid API Key',
          };
        }
        
        return { status: true };
      },
    },
    'example.com': {
      target: 'frontend-service:8080',
      ssl: false,
      remap: (url) => {
        // Rewrite old paths to new paths
        const rewrites = {
          '/old-path': '/new-path',
          '/legacy': '/modern',
        };
        
        for (const [oldPath, newPath] of Object.entries(rewrites)) {
          if (url.startsWith(oldPath)) {
            return url.replace(oldPath, newPath);
          }
        }
        
        return url;
      },
    },
    '*.example.com': {
      target: 'wildcard-service:4000',
      ssl: true,
      remap: (url) => {
        // Extract subdomain and add to path
        // This is a simplified example
        return url;
      },
    },
    'api.example.com:8080': {
      target: 'backend-service:8080',
      ssl: false,
      remap: (url) => {
        // Add version prefix
        if (!url.startsWith('/v1') && !url.startsWith('/v2')) {
          return `/v1${url}`;
        }
        return url;
      },
    },
  },
};

