# Robiki Proxy Tests

This directory contains comprehensive tests for the Robiki Proxy library.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   └── utils/              # Utility function tests
│       ├── config.test.ts  # Configuration management tests
│       ├── server.test.ts  # Server utility tests
│       ├── files.test.ts   # File utility tests
│       ├── time.test.ts    # Time utility tests
│       └── uuid.test.ts    # UUID generation tests
├── integration/            # Integration tests
│   ├── proxy-server.test.ts    # ProxyServer class tests
│   ├── http-proxy.test.ts      # HTTP proxy handler tests
│   ├── full-proxy.test.ts      # Full proxy integration tests
│   └── config-loading.test.ts  # Configuration file loading tests
├── advanced/               # Advanced feature tests
│   ├── websocket.test.ts   # WebSocket proxying tests
│   └── http2.test.ts       # HTTP/2 specific tests
├── docker/                 # Docker integration tests
│   ├── test-docker.sh      # Full Docker integration test
│   ├── test-config-loading.sh  # Config loading test
│   ├── validate.sh         # Prerequisites validation
│   └── README.md           # Docker testing documentation
└── helpers/                # Shared test utilities
    └── test-utils.ts       # Reusable test helpers
```

## Running Tests

### Run all tests

```bash
yarn test
```

### Run tests in watch mode

```bash
yarn test:watch
```

### Run tests with UI

```bash
yarn test:ui
```

### Run tests with coverage

```bash
yarn test:coverage
```

### Run Docker tests

```bash
# Full Docker integration test
yarn test:docker

# Config loading test
yarn test:docker:config

# Run all tests (unit + integration + Docker)
yarn test:all
```

### Run specific test file

```bash
yarn test tests/unit/utils/config.test.ts
```

### Run tests matching a pattern

```bash
yarn test -t "ProxyConfig"
```

## Test Categories

### Unit Tests

Unit tests focus on testing individual functions and classes in isolation. They are fast and don't require external dependencies.

**Coverage includes:**

- Configuration loading and management
- CORS header generation
- Header conversion (HTTP/1.1 ↔ HTTP/2)
- Time utilities
- File type detection
- UUID generation

### Integration Tests

Integration tests verify that different components work together correctly. They may start actual servers and make real HTTP requests.

**Coverage includes:**

- ProxyServer class functionality
- HTTP request proxying
- Route resolution
- URL remapping
- Request validation
- Multi-backend routing
- Configuration file loading (proxy.config.json)
- Environment variable configuration

### Advanced Tests

Advanced tests cover complex scenarios and protocol-specific features.

**Coverage includes:**

- WebSocket connection proxying
- WebSocket message forwarding
- WebSocket validation
- HTTP/2 stream handling
- HTTP/2 multiplexing
- HTTP/2 header compression concepts

### Docker Tests

Docker tests verify the containerized deployment of the proxy server.

**Coverage includes:**

- Docker image build process
- Container startup and health
- Configuration file mounting and loading
- Port accessibility
- Environment variable handling
- Graceful shutdown
- Docker Compose integration

See [tests/docker/README.md](docker/README.md) for detailed Docker testing documentation.

## Writing Tests

### Test Structure

Tests follow the Arrange-Act-Assert pattern:

```typescript
it('should do something', () => {
  // Arrange: Set up test data
  const config = { ... };

  // Act: Execute the code being tested
  const result = someFunction(config);

  // Assert: Verify the results
  expect(result).toBe(expectedValue);
});
```

### Async Tests

For asynchronous operations, use async/await:

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Test Lifecycle Hooks

Use lifecycle hooks to set up and tear down test environments:

```typescript
describe('Test Suite', () => {
  beforeAll(async () => {
    // Runs once before all tests
  });

  afterAll(async () => {
    // Runs once after all tests
  });

  beforeEach(() => {
    // Runs before each test
  });

  afterEach(() => {
    // Runs after each test
  });
});
```

### Mocking

For unit tests, mock external dependencies:

```typescript
import { vi } from 'vitest';

const mockFunction = vi.fn(() => 'mocked value');
```

## Test Coverage Goals

We aim for the following coverage targets:

- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

## Best Practices

1. **Descriptive test names:** Use clear, descriptive names that explain what is being tested
2. **One assertion per test:** Focus each test on a single behavior
3. **Avoid test interdependence:** Tests should be able to run in any order
4. **Clean up resources:** Always close servers, connections, and clean up after tests
5. **Use appropriate timeouts:** Set reasonable timeouts for async operations
6. **Test edge cases:** Include tests for error conditions and edge cases
7. **Keep tests fast:** Unit tests should run in milliseconds, integration tests in seconds

## Debugging Tests

### Run a single test

```bash
yarn test -t "specific test name"
```

### Run with verbose output

```bash
yarn test --reporter=verbose
```

### Debug in VS Code

Add a breakpoint and use the "Debug Test" option in VS Code's test explorer.

## Continuous Integration

Tests are automatically run in CI/CD pipelines on:

- Pull requests
- Commits to main branch
- Release builds

All tests must pass before code can be merged.

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all existing tests pass
3. Add tests for edge cases
4. Update this README if adding new test categories
5. Maintain or improve code coverage

## Troubleshooting

### Port conflicts

If tests fail due to port conflicts, the test suite uses high port numbers (9876-9894) to avoid conflicts. If you still experience issues, check for processes using these ports:

```bash
lsof -i :9876-9894
```

### Timeout errors

If tests timeout, increase the timeout in `vitest.config.ts` or for specific tests:

```typescript
it('slow test', async () => {
  // test code
}, 30000); // 30 second timeout
```

### WebSocket connection issues

WebSocket tests may fail if connections aren't properly closed. Ensure all WebSocket connections are explicitly closed in test cleanup.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Node.js HTTP/2 Documentation](https://nodejs.org/api/http2.html)
- [WebSocket API Documentation](https://github.com/websockets/ws)
