import { http2, websocket } from './utils/server';
import { restAPIProxyHandler, streamAPIProxyHandler, websocketAPIProxyHandler } from './connections';

export interface CertificateConfig {
  key: string;
  cert: string;
  ca?: string;
  allowHTTP1?: boolean;
}

process.on('uncaughtException', function (error: Error) {
  console.log('UNCAUGHT EXCEPTION: ', error);
});

process.on('unhandledRejection', function (reason: any, promise: Promise<any>) {
  console.log('UNHANDLED REJECTION: ', reason, promise);
});

Promise.resolve(console.log('STARTING SERVER....'))
  .then(() => http2(restAPIProxyHandler, streamAPIProxyHandler, { ...ssl, port: 443 }))
  .then((https2Server_443) => websocket(https2Server_443, websocketAPIProxyHandler))
  .then(() => http2(restAPIProxyHandler, streamAPIProxyHandler, { ...ssl, port: 8080 }))
  .then((https2Server_8080) => websocket(https2Server_8080, websocketAPIProxyHandler))
  .catch((err) => console.log('ERROR: ', err, '\n'));
