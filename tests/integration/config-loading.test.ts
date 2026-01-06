import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../../src/utils/config';

describe('Config File Loading', () => {
  const testConfigPath = join(process.cwd(), 'proxy.config.test.json');

  const cleanup = () => {
    if (existsSync(testConfigPath)) {
      try {
        unlinkSync(testConfigPath);
      } catch (e) {}
    }
  };

  it('should load proxy.config.json from file system', async () => {
    const testConfig = {
      routes: {
        'test.local': {
          target: 'localhost:3000',
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    try {
      const originalEnv = process.env.PROXY_CONFIG;
      process.env.PROXY_CONFIG = testConfigPath;

      const config = await loadConfig();

      expect(config).toBeDefined();
      expect(config.getRoute('test.local')).toBeDefined();

      const target = config.getTarget('test.local');
      expect(target.target).toBe('localhost:3000');

      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    } finally {
      cleanup();
    }
  });

  it('should handle empty routes configuration', async () => {
    const testConfig = {
      routes: {},
    };

    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    try {
      const originalEnv = process.env.PROXY_CONFIG;
      process.env.PROXY_CONFIG = testConfigPath;

      const config = await loadConfig();

      expect(config).toBeDefined();
      expect(config.getRoute('any.domain')).toBeUndefined();

      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    } finally {
      cleanup();
    }
  });

  it('should load configuration with CORS settings', async () => {
    const testConfig = {
      routes: {
        'api.local': {
          target: 'localhost:4000',
          cors: {
            origin: ['https://example.com'],
            methods: ['GET', 'POST'],
          },
        },
      },
      cors: {
        origin: '*',
        credentials: true,
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    try {
      const originalEnv = process.env.PROXY_CONFIG;
      process.env.PROXY_CONFIG = testConfigPath;

      const config = await loadConfig();

      expect(config).toBeDefined();

      const route = config.getRoute('api.local');
      expect(route).toBeDefined();
      expect(route?.target).toBe('localhost:4000');

      const corsHeaders = config.getCorsHeaders('https://example.com', 'api.local');
      expect(corsHeaders).toBeDefined();

      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    } finally {
      cleanup();
    }
  });

  it('should load configuration with wildcard routes', async () => {
    const testConfig = {
      routes: {
        '*.api.local': {
          target: 'localhost:5000',
        },
        'test.local': {
          target: 'localhost:3000',
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    try {
      const originalEnv = process.env.PROXY_CONFIG;
      process.env.PROXY_CONFIG = testConfigPath;

      const config = await loadConfig();

      expect(config).toBeDefined();

      const exactRoute = config.getRoute('test.local');
      expect(exactRoute).toBeDefined();
      expect(exactRoute?.target).toBe('localhost:3000');

      const wildcardRoute = config.getRoute('subdomain.api.local');
      expect(wildcardRoute).toBeDefined();
      expect(wildcardRoute?.target).toBe('localhost:5000');

      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    } finally {
      cleanup();
    }
  });

  it('should handle invalid JSON gracefully', async () => {
    writeFileSync(testConfigPath, 'invalid json {{{');

    try {
      const originalEnv = process.env.PROXY_CONFIG;
      process.env.PROXY_CONFIG = testConfigPath;

      const config = await loadConfig();
      expect(config).toBeDefined();

      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    } finally {
      cleanup();
    }
  });

  it('should handle missing config file gracefully', async () => {
    const originalEnv = process.env.PROXY_CONFIG;
    process.env.PROXY_CONFIG = '/nonexistent/path/to/config.json';

    try {
      const config = await loadConfig();
      expect(config).toBeDefined();
    } finally {
      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    }
  });

  it('should load the default proxy.config.json if it exists', async () => {
    const defaultConfigPath = join(process.cwd(), 'proxy.config.json');

    if (existsSync(defaultConfigPath)) {
      const config = await loadConfig();
      expect(config).toBeDefined();

      const configContent = readFileSync(defaultConfigPath, 'utf-8');
      expect(() => JSON.parse(configContent)).not.toThrow();
    } else {
      const config = await loadConfig();
      expect(config).toBeDefined();
    }
  });

  it('should prioritize PROXY_CONFIG environment variable over default file', async () => {
    const testConfig = {
      routes: {
        'env-test.local': {
          target: 'localhost:9999',
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    try {
      const originalEnv = process.env.PROXY_CONFIG;
      process.env.PROXY_CONFIG = testConfigPath;

      const config = await loadConfig();

      expect(config).toBeDefined();
      expect(config.getRoute('env-test.local')).toBeDefined();

      const target = config.getTarget('env-test.local');
      expect(target.target).toBe('localhost:9999');

      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    } finally {
      cleanup();
    }
  });

  it('should validate configuration structure', async () => {
    const validConfig = {
      routes: {
        'valid.local': {
          target: 'localhost:3000',
        },
      },
    };

    writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));

    try {
      const originalEnv = process.env.PROXY_CONFIG;
      process.env.PROXY_CONFIG = testConfigPath;

      const config = await loadConfig();

      expect(config).toBeDefined();
      expect(config.getRoute('valid.local')).toBeDefined();

      const target = config.getTarget('valid.local');
      expect(target.target).toBe('localhost:3000');

      if (originalEnv === undefined) {
        delete process.env.PROXY_CONFIG;
      } else {
        process.env.PROXY_CONFIG = originalEnv;
      }
    } finally {
      cleanup();
    }
  });
});
