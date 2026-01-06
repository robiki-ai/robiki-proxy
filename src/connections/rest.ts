import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { http2HeadersToHttp1Headers, http1ToHttp2Headers } from '../utils/server';
import { day } from '../utils/time';
import { isMediaFile } from '../utils/files';
import { type ProxyConfig } from '../utils/config';

const DEBUG = process.env.DEBUG === 'true';

export const restAPIProxyHandler = async (
  req: IncomingMessage,
  res: ServerResponse,
  config: ProxyConfig
): Promise<void> => {
  const { target, ssl, remap } = config.getTarget(req.headers.host || req.headers[':authority']?.toString() || '');

  if (req.httpVersion === '2.0' && ssl) return;

  if (!target) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (DEBUG) console.log('HTTP1 rest proxy', `${ssl ? 'https' : 'http'}://${target}${req.url}`, req.headers.host);

  if (remap) req.url = remap(req.url || '');

  const requestFn = ssl ? httpsRequest : httpRequest;
  const headers = req.httpVersion === '2.0' ? http2HeadersToHttp1Headers(req.headers) : req.headers;
  const method = req.httpVersion === '2.0' ? req.headers[':method']?.toString() : req.method;

  if (DEBUG) console.log('Proxy Request::', req.url, method, headers);
  const proxy = requestFn(
    `${ssl ? 'https' : 'http'}://${target}${req.url || ''}`,
    {
      ...(ssl ? { ...ssl, rejectUnauthorized: false } : {}),
      method,
      headers,
    },
    (proxyRes) => {
      const responseHeaders = req.httpVersion === '2.0' ? http1ToHttp2Headers(proxyRes.headers) : proxyRes.headers;

      if (req.url && isMediaFile(req.url)) {
        responseHeaders['cache-control'] = `public, max-age=${day()}`;
      }

      res.writeHead(proxyRes.statusCode || 500, responseHeaders);

      proxyRes.on('data', (chunk) => {
        if (!res.writableEnded && !res.closed && !res.destroyed) {
          res.write(chunk);
        }
      });

      proxyRes.on('end', () => {
        if (!res.writableEnded && !res.closed && !res.destroyed) {
          res.end();
        }
      });

      proxyRes.on('error', (error) => {
        if (DEBUG) console.error('Proxy response error:', error);
        if (!res.destroyed) res.destroy(error);
      });
    }
  );

  proxy.on('error', (error) => {
    if (DEBUG) console.error('Proxy request error:', error);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    }
  });

  req.on('data', (chunk) => {
    if (!proxy.writableEnded && !proxy.closed && !proxy.destroyed) {
      proxy.write(chunk);
    }
  });

  req.on('end', () => {
    if (!proxy.writableEnded && !proxy.closed && !proxy.destroyed) {
      proxy.end();
    }
  });

  req.on('error', (error) => {
    if (DEBUG) console.error('Client request error:', error);
    if (!proxy.destroyed) proxy.destroy(error);
  });
};
