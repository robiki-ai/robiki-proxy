import { createProxy } from '@robiki/proxy';

// Advanced configuration with CORS, validation, and URL remapping
const config = {
  ssl: {
    key: './certs/key.pem',
    cert: './certs/cert.pem',
    ca: './certs/ca.pem',
    allowHTTP1: true,
  },
  // Global CORS configuration
  cors: {
    origin: ['https://example.com', 'https://www.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  },
  // Global validation
  validate: async (info) => {
    console.log(`Request: ${info.method} ${info.path} from ${info.remoteAddress}`);

    // Example: Block requests from specific IPs
    if (info.remoteAddress === '192.168.1.100') {
      return {
        status: false,
        code: 403,
        message: 'Forbidden',
      };
    }

    // Example: Require authentication header
    if (!info.headers.authorization) {
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
      // Route-specific CORS (overrides global)
      cors: {
        origin: '*',
        credentials: false,
      },
      // URL remapping
      remap: (url) => {
        // Remove /api prefix
        return url.replace(/^\/api/, '');
      },
      // Route-specific validation
      validate: async (info) => {
        // Example: Rate limiting check
        const rateLimit = await checkRateLimit(info.remoteAddress);
        if (!rateLimit.allowed) {
          return {
            status: false,
            code: 429,
            message: 'Too Many Requests',
            headers: {
              'retry-after': rateLimit.retryAfter.toString(),
            },
          };
        }
        return { status: true };
      },
    },
    'example.com': {
      target: 'frontend-service:8080',
      ssl: false,
      remap: (url) => {
        // Rewrite /old-path to /new-path
        return url.replace(/^\/old-path/, '/new-path');
      },
    },
    // Wildcard routing
    '*.subdomain.example.com': {
      target: 'microservices:4000',
      ssl: true,
      remap: (url) => {
        // Extract subdomain and add to path
        const subdomain = url.split('.')[0];
        return `/${subdomain}${url}`;
      },
    },
  },
};

// Mock rate limiting function
async function checkRateLimit(ip) {
  // Implement your rate limiting logic here
  return { allowed: true, retryAfter: 0 };
}

// Start the proxy
const proxy = await createProxy(config);

console.log('Advanced proxy server is running!');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await proxy.stop();
  process.exit(0);
});
