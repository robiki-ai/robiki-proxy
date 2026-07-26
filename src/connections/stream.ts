import { connect, type IncomingHttpHeaders, type ServerHttp2Stream } from 'node:http2';
import { day } from '../utils/time';
import { isMediaFile } from '../utils/files';
import { type ProxyConfig } from '../utils/config';
import { debug } from '../utils/console';

export const streamAPIProxyHandler = async (
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  config: ProxyConfig
) => {
  /* Attached before anything else: a stream that emits 'error' with no
     listener (e.g. the client disconnects abruptly before the upstream
     session is established) throws an uncaught exception that kills the
     whole process */
  stream.on('error', (error) => {
    debug('HTTP2 stream proxy error:', error);
  });

  const { target, ssl, remap } = config.getTarget(headers[':authority'] || '');
  if (!ssl) return;
  if (!target) {
    stream.destroy(new Error('Not Found'));
    return;
  }

  debug(`HTTP2 stream proxy for ${headers[':authority']}`, `${ssl ? 'https' : 'http'}://${target}${headers[':path']}`);

  if (remap) headers[':path'] = remap(headers[':path'] || '');

  debug('Proxy Request::', headers[':path']);

  const proxy = connect(`https://${target}${headers[':path']}`, {
    ...ssl,
    rejectUnauthorized: false,
  });

  /* If the client goes away before the upstream session is established,
     make sure the upstream session is torn down too */
  stream.on('close', () => {
    if (!proxy.closed && !proxy.destroyed) proxy.close();
  });

  proxy.on('connect', () => {
    const request = proxy.request(headers);

    /* HEADERS */
    request.on('response', (headerResponse) => {
      if (!stream.writableEnded && !stream.closed && !stream.destroyed) {
        debug(`Proxy Response for ${headers[':path']}::`, headerResponse[':status']);
        if (headers[':path'] && isMediaFile(headers[':path'])) {
          headerResponse['cache-control'] = `public, max-age=${day()}`;
        }
        stream.respond(headerResponse);
      }
    });

    /* FROM CLIENT TO PROXY */
    stream.on('data', (chunk) => {
      if (!request.writableEnded && !request.closed && !request.destroyed) {
        request.write(chunk);
      }
    });

    stream.on('end', () => {
      if (!request.writableEnded && !request.closed && !request.destroyed) {
        request.end();
      }
    });

    stream.on('close', () => {
      if (!request.closed && !request.destroyed) request.close();
    });

    /* 'goaway' is a session-level event: it fires on the upstream session
       when the target service shuts down, never on the stream itself */
    proxy.on('goaway', (errorCode) => {
      if (errorCode && !request.destroyed) {
        request.destroy(new Error(`HTTP/2 connection closed with error code ${errorCode}`));
      }
      if (!stream.closed && !stream.destroyed) stream.close();
    });

    stream.on('error', (error) => {
      if (!request.destroyed) request.destroy(error);
      if (!proxy.closed) proxy.close();
    });

    /* FROM PROXY TO CLIENT */
    request.on('data', (chunk) => {
      if (!stream.writableEnded && !stream.closed && !stream.destroyed) {
        stream.write(chunk);
      }
    });

    request.on('end', () => {
      if (!stream.writableEnded && !stream.closed && !stream.destroyed) {
        stream.end();
      }
    });

    request.on('close', () => {
      if (!stream.closed && !stream.destroyed) stream.close();
    });

    request.on('error', (error) => {
      debug('HTTP2 request proxy error:', error);
      if (!stream.destroyed) stream.destroy(error);
      return !proxy.closed && proxy.close();
    });

    proxy.on('timeout', () => {
      debug('HTTP/2 client timeout');
      if (!stream.destroyed) stream.destroy(new Error('HTTP/2 client timeout'));
    });
  });

  proxy.on('error', (error) => {
    debug('HTTP2 proxy connection error:', error);
    if (!stream.destroyed) {
      stream.destroy(error);
    }
  });
};
