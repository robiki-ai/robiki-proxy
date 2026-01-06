# Docker Tests

This directory contains Docker integration tests for the Robiki Proxy.

## Test Scripts

### 1. `test-docker.sh`

Comprehensive Docker build and runtime tests.

**What it tests:**

- Docker image builds successfully
- Container starts and stays running
- Configuration is loaded correctly
- Ports are accessible
- Environment variables are set
- Health checks work
- Graceful shutdown

**Usage:**

```bash
./tests/docker/test-docker.sh
```

Or using Make:

```bash
make test-docker-full
```

### 2. `test-config-loading.sh`

Tests specifically for proxy.config.json loading.

**What it tests:**

- Empty routes configuration
- Multiple routes configuration
- CORS configuration
- Wildcard routes
- File permissions and readability
- Configuration priority (file > env > defaults)

**Usage:**

```bash
./tests/docker/test-config-loading.sh
```

Or using Make:

```bash
make test-docker-config
```

## Quick Test Commands

### Build Docker Images

```bash
# Standard build (with dev dependencies for build process)
make docker-build

# Build with dev dependencies (for testing/development)
make docker-build-dev

# Build without dev dependencies (production-optimized)
make docker-build-prod
```

### Build and Basic Test

```bash
make test-docker
```

### Full Integration Test

```bash
make test-docker-full
```

### Config Loading Test

```bash
make test-docker-config
```

### Docker Compose Test

```bash
make test-docker-compose
```

## Build Arguments

The Dockerfile supports a build argument to control dependency installation:

- `INSTALL_DEV_DEPS=true` (default) - Installs all dependencies including devDependencies. Required for building the application.
- `INSTALL_DEV_DEPS=false` - Installs only production dependencies. Use this for ultra-minimal production images when you already have pre-built artifacts.

**Examples:**

```bash
# Build with dev dependencies (default, includes build tools)
docker build --build-arg INSTALL_DEV_DEPS=true -t robiki/proxy:latest .

# Build without dev dependencies (smaller image, no build)
docker build --build-arg INSTALL_DEV_DEPS=false -t robiki/proxy:prod .
```

**Note:** The default behavior (`INSTALL_DEV_DEPS=true`) is recommended for most use cases as it builds the application from source.

## Manual Testing

### 1. Build the Image

```bash
docker build -t robiki/proxy:test .
```

### 2. Create Test Config

```bash
cat > proxy.config.test.json <<EOF
{
  "routes": {
    "test.local": {
      "target": "httpbin.org:80"
    }
  }
}
EOF
```

### 3. Run Container

```bash
docker run -d \
  --name test-proxy \
  -p 8080:8080 \
  -v $(pwd)/proxy.config.test.json:/usr/src/proxy.config.json:ro \
  robiki/proxy:test
```

### 4. Check Logs

```bash
docker logs test-proxy
```

### 5. Test Connection

```bash
curl -v http://localhost:8080/get -H "Host: test.local"
```

### 6. Cleanup

```bash
docker stop test-proxy
docker rm test-proxy
rm proxy.config.test.json
```

## Configuration Examples

### Minimal Config

```json
{
  "routes": {
    "example.com": {
      "target": "localhost:3000"
    }
  }
}
```

### With CORS

```json
{
  "routes": {
    "api.example.com": {
      "target": "localhost:3000"
    }
  },
  "cors": {
    "origin": "*",
    "credentials": true
  }
}
```

### With SSL (requires certificates)

```json
{
  "ssl": {
    "key": "/usr/src/certs/key.pem",
    "cert": "/usr/src/certs/cert.pem",
    "allowHTTP1": true
  },
  "routes": {
    "secure.example.com": {
      "target": "localhost:3000",
      "ssl": true
    }
  }
}
```

### With Wildcard Routes

```json
{
  "routes": {
    "*.api.example.com": {
      "target": "localhost:4000"
    },
    "example.com": {
      "target": "localhost:3000"
    }
  }
}
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs <container-name>

# Check if config file is mounted
docker exec <container-name> ls -la /usr/src/proxy.config.json

# Check if config is valid JSON
docker exec <container-name> cat /usr/src/proxy.config.json | node -e "JSON.parse(require('fs').readFileSync(0, 'utf-8'))"
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8080

# Use different port mapping
docker run -p 9000:8080 ...
```

### Config Not Loading

```bash
# Verify environment variable
docker exec <container-name> env | grep PROXY_CONFIG

# Check file permissions
docker exec <container-name> ls -la /usr/src/proxy.config.json

# Test config parsing
docker exec <container-name> node -e "console.log(require('/usr/src/proxy.config.json'))"
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. See `.github/workflows/test.yml` for GitHub Actions integration.

### Expected Test Results

- ✅ All tests should pass on `main` branch
- ✅ Docker build should complete in < 2 minutes
- ✅ Container should start in < 10 seconds
- ✅ All ports should be accessible
- ✅ Configuration should load without errors

## Performance Benchmarks

Expected resource usage:

- **Build time**: < 2 minutes
- **Image size**: ~200-300 MB
- **Memory usage**: ~50-100 MB
- **CPU usage**: < 5% idle
- **Startup time**: < 10 seconds

## Security Notes

- Container runs as non-root user (`node`)
- Uses `dumb-init` for proper signal handling
- Configuration files should be mounted read-only (`:ro`)
- Secrets should be passed via environment variables or Docker secrets
- Health checks are enabled by default

## Further Reading

- [Dockerfile](../../Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)
- [Main README](../../README.md)
