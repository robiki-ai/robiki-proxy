import { connect, type IncomingHttpHeaders, type ServerHttp2Stream } from 'node:http2';
import { day } from '../utils/time';
import { isMediaFile } from '../utils/files';
import { getConfig } from '../utils/config';

export const streamAPIProxyHandler = async (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => {
  const config = getConfig();
  const { target, ssl, remap } = config.getTarget(headers[':authority'] || '');
  if (!ssl) return;
  if (!target) {
    stream.destroy(new Error('Not Found'));
    return;
  }

  console.log('HTTP2 stream proxy', `${ssl ? 'https' : 'http'}://${target}${headers[':path']}`, headers[':authority']);

  if (remap) headers[':path'] = remap(headers[':path'] || '');

  console.log('Proxy Request::', headers[':path']);

  const proxy = connect(`https://${target}${headers[':path']}`, {
    ...ssl,
    rejectUnauthorized: false,
  });

  proxy.on('connect', () => {
    const request = proxy.request(headers);

    /* HEADERS */
    request.on('response', (headerResponse) => {
      if (!stream.writableEnded && !stream.closed && !stream.destroyed) {
        console.log('Proxy Response::', headerResponse[':status'], `for ${headers[':path']}`);
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

    stream.on('goaway', (_, errorCode) => {
      if (errorCode && !request.destroyed) {
        request.destroy(new Error(`HTTP/2 connection closed with error code ${errorCode}`));
      }
      if (!stream.closed && !stream.destroyed) stream.close();
    });

    stream.on('error', (error) => {
      console.error('HTTP2 stream proxy error:', error);
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
      console.error('HTTP2 request proxy error:', error);
      if (!stream.destroyed) stream.destroy(error);
      return !proxy.closed && proxy.close();
    });

    proxy.on('timeout', () => {
      console.error('HTTP/2 client timeout');
      if (!stream.destroyed) stream.destroy(new Error('HTTP/2 client timeout'));
    });
  });

  proxy.on('error', (error) => {
    console.error('HTTP2 proxy connection error:', error);
    if (!stream.destroyed) {
      stream.destroy(error);
    }
  });
};
