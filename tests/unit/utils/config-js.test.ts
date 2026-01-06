import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../../src/utils/config';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('JavaScript Config Loading', () => {
  const originalEnv = process.env.PROXY_CONFIG;
  let testConfigPath: string;

  beforeEach(() => {
    // Use unique file for each test to avoid caching issues
    testConfigPath = resolve(__dirname, `test-config-${Date.now()}-${Math.random().toString(36).substring(7)}.js`);
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.PROXY_CONFIG = originalEnv;
    } else {
      delete process.env.PROXY_CONFIG;
    }

    // Clean up test config file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  it('should load JavaScript config file with functions', async () => {
    // Create a test config file
    const configContent = `
export default {
  routes: {
    'test.example.com': {
      target: 'localhost:3000',
      ssl: false,
      remap: (url) => {
        return url.replace(/^\\/api/, '');
      },
      validate: async (info) => {
        if (!info.headers.authorization) {
          return {
            status: false,
            code: 401,
            message: 'Unauthorized',
          };
        }
        return { status: true };
      },
    },
  },
};
`;

    writeFileSync(testConfigPath, configContent);
    process.env.PROXY_CONFIG = testConfigPath;

    const config = await loadConfig();
    const route = config.getRoute('test.example.com');

    expect(route).toBeDefined();
    expect(route?.target).toBe('localhost:3000');
    expect(route?.ssl).toBe(false);
    expect(typeof route?.remap).toBe('function');
    expect(typeof route?.validate).toBe('function');
  });

  it('should execute remap function correctly', async () => {
    const configContent = `
export default {
  routes: {
    'api.example.com': {
      target: 'backend:3000',
      remap: (url) => {
        return url.replace(/^\\/api/, '');
      },
    },
  },
};
`;

    writeFileSync(testConfigPath, configContent);
    process.env.PROXY_CONFIG = testConfigPath;

    const config = await loadConfig();
    const route = config.getRoute('api.example.com');

    expect(route?.remap).toBeDefined();
    if (route?.remap) {
      const remappedUrl = route.remap('/api/users');
      expect(remappedUrl).toBe('/users');
    }
  });

  it('should execute validate function correctly', async () => {
    const configContent = `
export default {
  routes: {
    'secure.example.com': {
      target: 'backend:3000',
      validate: async (info) => {
        if (!info.headers.authorization) {
          return {
            status: false,
            code: 401,
            message: 'Unauthorized',
          };
        }
        return { status: true };
      },
    },
  },
};
`;

    writeFileSync(testConfigPath, configContent);
    process.env.PROXY_CONFIG = testConfigPath;

    const config = await loadConfig();
    const route = config.getRoute('secure.example.com');

    expect(route?.validate).toBeDefined();
    if (route?.validate) {
      // Test without authorization
      const resultNoAuth = await route.validate({
        id: 1,
        method: 'GET',
        path: '/test',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        authority: 'secure.example.com',
        origin: 'https://secure.example.com',
        headers: {},
        query: new URLSearchParams(),
        type: 'rest' as any,
        respond: () => {},
        end: () => {},
      });

      expect(resultNoAuth.status).toBe(false);
      expect(resultNoAuth.code).toBe(401);
      expect(resultNoAuth.message).toBe('Unauthorized');

      // Test with authorization
      const resultWithAuth = await route.validate({
        id: 1,
        method: 'GET',
        path: '/test',
        remoteAddress: '127.0.0.1',
        scheme: 'https',
        authority: 'secure.example.com',
        origin: 'https://secure.example.com',
        headers: { authorization: 'Bearer token' },
        query: new URLSearchParams(),
        type: 'rest' as any,
        respond: () => {},
        end: () => {},
      });

      expect(resultWithAuth.status).toBe(true);
    }
  });

  it('should support environment variables in config', async () => {
    process.env.TEST_TARGET = 'custom-backend:4000';

    const configContent = `
export default {
  routes: {
    'env.example.com': {
      target: process.env.TEST_TARGET || 'default:3000',
    },
  },
};
`;

    writeFileSync(testConfigPath, configContent);
    process.env.PROXY_CONFIG = testConfigPath;

    const config = await loadConfig();
    const route = config.getRoute('env.example.com');

    expect(route?.target).toBe('custom-backend:4000');

    delete process.env.TEST_TARGET;
  });

  it('should handle complex remap logic', async () => {
    const configContent = `
export default {
  routes: {
    'complex.example.com': {
      target: 'backend:3000',
      remap: (url) => {
        // Multiple transformations
        if (url.startsWith('/old')) {
          return url.replace('/old', '/new');
        }
        if (url.startsWith('/v1')) {
          return url.replace('/v1', '/v2');
        }
        return url;
      },
    },
  },
};
`;

    writeFileSync(testConfigPath, configContent);
    process.env.PROXY_CONFIG = testConfigPath;

    const config = await loadConfig();
    const route = config.getRoute('complex.example.com');

    if (route?.remap) {
      expect(route.remap('/old/path')).toBe('/new/path');
      expect(route.remap('/v1/api')).toBe('/v2/api');
      expect(route.remap('/other')).toBe('/other');
    }
  });

  it('should merge JS config with programmatic config', async () => {
    const configContent = `
export default {
  routes: {
    'file.example.com': {
      target: 'file-backend:3000',
    },
  },
};
`;

    writeFileSync(testConfigPath, configContent);
    process.env.PROXY_CONFIG = testConfigPath;

    const config = await loadConfig({
      routes: {
        'programmatic.example.com': {
          target: 'programmatic-backend:4000',
        },
      },
    });

    // Both routes should be available
    const fileRoute = config.getRoute('file.example.com');
    const progRoute = config.getRoute('programmatic.example.com');

    expect(fileRoute?.target).toBe('file-backend:3000');
    expect(progRoute?.target).toBe('programmatic-backend:4000');
  });
});
