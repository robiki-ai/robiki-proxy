#!/bin/bash
set -e

echo "📄 Testing proxy.config.json Loading"
echo "====================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker stop config-test-1 config-test-2 config-test-3 2>/dev/null || true
    docker rm config-test-1 config-test-2 config-test-3 2>/dev/null || true
    rm -f /tmp/proxy.*.test.json
}

trap cleanup EXIT

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ $2${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Build image first
echo "📦 Building Docker image..."
docker build --build-arg INSTALL_DEV_DEPS=true -t robiki/proxy:test . > /dev/null 2>&1 || {
    echo -e "${RED}Failed to build image${NC}"
    exit 1
}

# Test 1: Default config loading (empty routes)
echo ""
echo "🧪 Test 1: Loading config with empty routes..."
cat > /tmp/proxy.empty.test.json <<'EOF'
{
  "routes": {}
}
EOF

docker run -d --name config-test-1 \
  -p 18081:8080 \
  -v /tmp/proxy.empty.test.json:/usr/src/proxy.config.json:ro \
  robiki/proxy:test > /dev/null 2>&1

sleep 5

if docker logs config-test-1 2>&1 | grep -q "STARTING PROXY SERVER"; then
    test_result 0 "Empty routes config loads successfully"
else
    test_result 1 "Empty routes config failed to load"
    docker logs config-test-1
fi

docker stop config-test-1 > /dev/null 2>&1

# Test 2: Config with routes
echo ""
echo "🧪 Test 2: Loading config with multiple routes..."
cat > /tmp/proxy.routes.test.json <<'EOF'
{
  "routes": {
    "api.local": {
      "target": "localhost:3000"
    },
    "web.local": {
      "target": "localhost:8080"
    },
    "*.wildcard.local": {
      "target": "localhost:9000"
    }
  },
  "cors": {
    "origin": "*",
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "credentials": true
  }
}
EOF

docker run -d --name config-test-2 \
  -p 18082:8080 \
  -v /tmp/proxy.routes.test.json:/usr/src/proxy.config.json:ro \
  robiki/proxy:test > /dev/null 2>&1

sleep 5

LOGS=$(docker logs config-test-2 2>&1)

if echo "$LOGS" | grep -q "STARTING PROXY SERVER"; then
    test_result 0 "Routes config loads successfully"
else
    test_result 1 "Routes config failed to load"
    echo "$LOGS"
fi

if echo "$LOGS" | grep -q "Ports:"; then
    test_result 0 "Ports are configured"
else
    test_result 1 "Ports configuration missing"
fi

docker stop config-test-2 > /dev/null 2>&1

# Test 3: Config with CORS and validation
echo ""
echo "🧪 Test 3: Loading config with CORS settings..."
cat > /tmp/proxy.cors.test.json <<'EOF'
{
  "routes": {
    "test.local": {
      "target": "example.com:80",
      "cors": {
        "origin": ["https://allowed.com"],
        "methods": ["GET", "POST"]
      }
    }
  },
  "cors": {
    "origin": "*",
    "credentials": true
  }
}
EOF

docker run -d --name config-test-3 \
  -p 18083:8080 \
  -v /tmp/proxy.cors.test.json:/usr/src/proxy.config.json:ro \
  robiki/proxy:test > /dev/null 2>&1

sleep 5

if docker logs config-test-3 2>&1 | grep -q "STARTING PROXY SERVER"; then
    test_result 0 "CORS config loads successfully"
else
    test_result 1 "CORS config failed to load"
    docker logs config-test-3
fi

docker stop config-test-3 > /dev/null 2>&1

# Test 4: Verify config file is readable inside container
echo ""
echo "🧪 Test 4: Verifying config file is readable inside container..."
docker run -d --name config-test-4 \
  -v /tmp/proxy.routes.test.json:/usr/src/proxy.config.json:ro \
  robiki/proxy:test > /dev/null 2>&1

sleep 3

if docker exec config-test-4 cat /usr/src/proxy.config.json > /dev/null 2>&1; then
    test_result 0 "Config file is readable inside container"
else
    test_result 1 "Config file is not readable inside container"
fi

if docker exec config-test-4 test -r /usr/src/proxy.config.json; then
    test_result 0 "Config file has read permissions"
else
    test_result 1 "Config file permissions issue"
fi

docker stop config-test-4 > /dev/null 2>&1
docker rm config-test-4 > /dev/null 2>&1

# Final Results
echo ""
echo "====================================="
echo "📊 Configuration Loading Test Results"
echo "====================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "====================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All configuration tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some configuration tests failed${NC}"
    exit 1
fi

