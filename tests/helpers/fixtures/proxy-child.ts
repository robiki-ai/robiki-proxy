/*
 * Library-mode proxy child process for resilience tests.
 *
 * Runs in its own process (like a real deployment embedding createProxy) so
 * tests can assert that abrupt peer disconnects do not kill the process.
 */
import { createProxy } from '../../../src/index';

const port = Number(process.env.PROXY_PORT);
const target = process.env.PROXY_TARGET as string;

await createProxy({
  ports: [port],
  routes: {
    localhost: { target },
  },
});

console.log('PROXY_READY');
