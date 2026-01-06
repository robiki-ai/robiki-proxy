import { createCustomProxy } from '@robiki/proxy';

// Configuration
const config = {
  ssl: {
    key: './certs/key.pem',
    cert: './certs/cert.pem',
    allowHTTP1: true,
  },
  routes: {
    'api.example.com': {
      target: 'backend-service:3000',
      ssl: true,
    },
  },
};

// Custom REST handler
const customRestHandler = async (req, res) => {
  console.log(`Custom REST handler: ${req.method} ${req.url}`);

  // Add custom logic here
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
  }

  // Fall back to default proxy behavior
  const { restAPIProxyHandler } = await import('@robiki/proxy/connections');
  return restAPIProxyHandler(req, res);
};

// Custom WebSocket handler
const customWebSocketHandler = async (req, socket, headers) => {
  console.log(`Custom WebSocket handler: ${req.url}`);

  // Add custom WebSocket logic here
  socket.on('message', (data) => {
    console.log('Received WebSocket message:', data.toString());
    // Transform or validate messages
    socket.send(data);
  });

  // Fall back to default proxy behavior
  const { websocketAPIProxyHandler } = await import('@robiki/proxy/connections');
  return websocketAPIProxyHandler(req, socket, headers);
};

// Custom stream handler
const customStreamHandler = async (stream, headers, flags) => {
  console.log(`Custom stream handler: ${headers[':path']}`);

  // Add custom HTTP/2 stream logic here

  // Fall back to default proxy behavior
  const { streamAPIProxyHandler } = await import('@robiki/proxy/connections');
  return streamAPIProxyHandler(stream, headers, flags);
};

// Start the proxy with custom handlers
const proxy = await createCustomProxy(config, {
  rest: customRestHandler,
  websocket: customWebSocketHandler,
  stream: customStreamHandler,
});

console.log('Custom proxy server is running!');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await proxy.stop();
  process.exit(0);
});
