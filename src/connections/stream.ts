import { pipeline } from 'node:stream';
import {
  connect,
  type ClientHttp2Session,
  type ClientHttp2Stream,
  type IncomingHttpHeaders,
  type ServerHttp2Stream,
} from 'node:http2';
import { day } from '../utils/time';
import { isMediaFile } from '../utils/files';
import { type ProxyConfig } from '../utils/config';
import { debug } from '../utils/console';

function destroyQuietly(
  target: { destroyed: boolean; destroy: (err?: Error) => void } | undefined,
  err?: Error
): void {
  if (!target || target.destroyed) return;
  try {
    target.destroy(err);
  } catch {
    /* already tearing down */
  }
}

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

  /* Authority only: a path here is ignored by connect() but makes traces and
     session identity misleading. */
  const session: ClientHttp2Session = connect(`https://${target}`, {
    ...ssl,
    rejectUnauthorized: false,
  });

  let request: ClientHttp2Stream | undefined;
  let cleaned = false;

  /* Always destroy — never close() — the upstream request and session.
     close() waits until pending response data is read, so a client abort
     against a long-lived or infinite upstream (SSE, streamed LLM output)
     leaves ClientHttp2Stream + ClientHttp2Session + TLS buffers allocated
     until the process is OOM-killed. */
  const cleanup = (err?: Error) => {
    if (cleaned) return;
    cleaned = true;
    destroyQuietly(request, err);
    destroyQuietly(session, err);
  };

  session.on('error', (error) => {
    debug('HTTP2 proxy connection error:', error);
    destroyQuietly(stream, error);
    cleanup(error);
  });

  session.on('goaway', (errorCode) => {
    const error = errorCode ? new Error(`HTTP/2 connection closed with error code ${errorCode}`) : undefined;
    if (error) debug('HTTP2 proxy GOAWAY:', error);
    destroyQuietly(stream, error);
    cleanup(error);
  });

  try {
    request = session.request(headers);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    debug('HTTP2 proxy request() failed:', err);
    destroyQuietly(stream, err);
    cleanup(err);
    return;
  }

  const upstream = request;

  upstream.on('error', (error) => {
    debug('HTTP2 request proxy error:', error);
    destroyQuietly(stream, error);
    cleanup(error);
  });

  /* Client gone before headers or mid-body: abort the upstream response
     stream immediately so it cannot keep buffering. */
  stream.on('close', () => cleanup());

  upstream.on('response', (headerResponse) => {
    if (stream.destroyed || stream.closed || stream.writableEnded) {
      cleanup();
      return;
    }

    debug(`Proxy Response for ${headers[':path']}::`, headerResponse[':status']);
    if (headers[':path'] && isMediaFile(headers[':path'])) {
      headerResponse['cache-control'] = `public, max-age=${day()}`;
    }

    try {
      stream.respond(headerResponse);
    } catch (error) {
      debug('Failed to write HTTP/2 response headers:', error);
      cleanup(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    /* Upstream response → client. pipeline() applies backpressure and
       destroys the source if the client goes away, which is what close()
       failed to do for ClientHttp2Stream. */
    pipeline(upstream, stream, (err) => {
      if (err) debug('HTTP2 upstream→client pipeline error:', err);
      cleanup(err || undefined);
    });
  });

  /* Client request body → upstream. Attached immediately so bytes arriving
     before the TLS session is up are not buffered unbounded on `stream`. */
  pipeline(stream, upstream, (err) => {
    if (err) debug('HTTP2 client→upstream pipeline error:', err);
    if (err) cleanup(err);
  });
};
