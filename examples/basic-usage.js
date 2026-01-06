import { createProxy } from '@robiki/proxy';

// Basic configuration
const config = {
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
};

// Start the proxy
const proxy = await createProxy(config);

console.log('Proxy server is running!');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await proxy.stop();
  process.exit(0);
});
