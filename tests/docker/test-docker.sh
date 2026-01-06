#!/bin/bash
set -e

echo "🐳 Testing Docker Build and Functionality"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results counter
TESTS_PASSED=0
TESTS_FAILED=0

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker stop robiki-proxy-test 2>/dev/null || true
    docker rm robiki-proxy-test 2>/dev/null || true
    rm -f /tmp/proxy.config.test.json
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Test result function
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ $2${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        if [ -n "$3" ]; then
            echo -e "${RED}   Error: $3${NC}"
        fi
    fi
}

# Step 1: Build the image
echo ""
echo "📦 Step 1: Building Docker image..."
if docker build -t robiki/proxy:test . > /tmp/docker-build.log 2>&1; then
    test_result 0 "Docker build successful"
else
    test_result 1 "Docker build failed" "Check /tmp/docker-build.log for details"
    cat /tmp/docker-build.log
    exit 1
fi

# Step 2: Verify image exists
echo ""
echo "🔍 Step 2: Verifying image..."
if docker images | grep -q "robiki/proxy.*test"; then
    test_result 0 "Docker image exists"
    docker images | grep "robiki/proxy"
else
    test_result 1 "Docker image not found"
    exit 1
fi

# Step 3: Create test config
echo ""
echo "📝 Step 3: Creating test configuration..."
cat > /tmp/proxy.config.test.json <<'EOF'
{
  "routes": {
    "test.local": {
      "target": "httpbin.org:80"
    },
    "example.local": {
      "target": "example.com:80"
    }
  },
  "cors": {
    "origin": "*",
    "credentials": true
  }
}
EOF

if [ -f /tmp/proxy.config.test.json ]; then
    test_result 0 "Test configuration created"
    echo "Configuration content:"
    cat /tmp/proxy.config.test.json | head -10
else
    test_result 1 "Failed to create test configuration"
    exit 1
fi

# Step 4: Start container
echo ""
echo "🚀 Step 4: Starting container..."
if docker run -d \
  --name robiki-proxy-test \
  -p 18080:8080 \
  -p 14443:443 \
  -e PROXY_CONFIG=/usr/src/proxy.config.json \
  -v /tmp/proxy.config.test.json:/usr/src/proxy.config.json:ro \
  robiki/proxy:test > /dev/null 2>&1; then
    test_result 0 "Container started"
else
    test_result 1 "Failed to start container"
    exit 1
fi

# Step 5: Wait for container to be ready
echo ""
echo "⏳ Step 5: Waiting for container to be ready..."
sleep 8

# Step 6: Check if container is running
echo ""
echo "🔍 Step 6: Checking container status..."
if docker ps | grep -q robiki-proxy-test; then
    test_result 0 "Container is running"
    echo "Container details:"
    docker ps --filter name=robiki-proxy-test --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    test_result 1 "Container is not running"
    echo "Container logs:"
    docker logs robiki-proxy-test
    exit 1
fi

# Step 7: Check container logs for startup
echo ""
echo "📋 Step 7: Checking container logs..."
LOGS=$(docker logs robiki-proxy-test 2>&1)
echo "$LOGS"

if echo "$LOGS" | grep -q "STARTING PROXY SERVER"; then
    test_result 0 "Proxy server started"
else
    test_result 1 "Proxy server startup message not found in logs"
fi

if echo "$LOGS" | grep -q "Ports:"; then
    test_result 0 "Ports configuration logged"
else
    test_result 1 "Ports configuration not found in logs"
fi

# Step 8: Verify configuration was loaded
echo ""
echo "📄 Step 8: Verifying configuration loading..."
if echo "$LOGS" | grep -q "443\|8080\|9229"; then
    test_result 0 "Configuration ports detected in logs"
else
    test_result 1 "Configuration ports not found in logs"
fi

# Step 9: Check if ports are listening
echo ""
echo "🔌 Step 9: Testing if ports are accessible..."
sleep 2

# Test port 18080 (mapped from 8080)
if curl -s -o /dev/null -w "%{http_code}" http://localhost:18080 2>&1 | grep -q "404\|502\|200"; then
    test_result 0 "Port 18080 (8080) is responding"
else
    test_result 1 "Port 18080 (8080) is not responding"
fi

# Step 10: Test environment variable configuration
echo ""
echo "🌍 Step 10: Checking environment variables..."
if docker exec robiki-proxy-test env | grep -q "PROXY_CONFIG=/usr/src/proxy.config.json"; then
    test_result 0 "PROXY_CONFIG environment variable is set"
else
    test_result 1 "PROXY_CONFIG environment variable not found"
fi

if docker exec robiki-proxy-test env | grep -q "NODE_ENV=production"; then
    test_result 0 "NODE_ENV is set to production"
else
    test_result 1 "NODE_ENV not set correctly"
fi

# Step 11: Verify config file exists in container
echo ""
echo "📂 Step 11: Verifying config file in container..."
if docker exec robiki-proxy-test test -f /usr/src/proxy.config.json; then
    test_result 0 "Config file exists in container"
    echo "Config file content:"
    docker exec robiki-proxy-test cat /usr/src/proxy.config.json | head -10
else
    test_result 1 "Config file not found in container"
fi

# Step 12: Test health check endpoint
echo ""
echo "🏥 Step 12: Testing health check endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18080/robiki-proxy/health 2>&1)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    test_result 0 "Health check endpoint returns 200"
else
    test_result 1 "Health check endpoint failed" "Expected 200, got $HEALTH_RESPONSE"
fi

# Verify health check response body
HEALTH_BODY=$(curl -s http://localhost:18080/robiki-proxy/health 2>&1)
if [ "$HEALTH_BODY" = "OK" ]; then
    test_result 0 "Health check returns correct body"
else
    test_result 1 "Health check body incorrect" "Expected 'OK', got '$HEALTH_BODY'"
fi

# Step 12b: Check Docker container health status
echo ""
echo "🏥 Step 12b: Checking Docker health status..."
sleep 5  # Wait for health check to run
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' robiki-proxy-test 2>/dev/null || echo "no-health")

if [ "$HEALTH_STATUS" = "healthy" ]; then
    test_result 0 "Container health status is healthy"
elif [ "$HEALTH_STATUS" = "starting" ]; then
    echo -e "${YELLOW}⏳ Health check still starting${NC}"
    # Wait a bit more and check again
    sleep 10
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' robiki-proxy-test 2>/dev/null || echo "no-health")
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        test_result 0 "Container health status is healthy (after wait)"
    else
        test_result 1 "Container health check not healthy" "Status: $HEALTH_STATUS"
    fi
else
    test_result 1 "Container health check failed" "Status: $HEALTH_STATUS"
fi

# Step 13: Check resource usage
echo ""
echo "💻 Step 13: Checking resource usage..."
docker stats robiki-proxy-test --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Step 14: Test graceful shutdown
echo ""
echo "🛑 Step 14: Testing graceful shutdown..."
if docker stop robiki-proxy-test --time 10 > /dev/null 2>&1; then
    test_result 0 "Container stopped gracefully"
else
    test_result 1 "Container did not stop gracefully"
fi

# Final Results
echo ""
echo "=========================================="
echo "📊 Test Results Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "=========================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All Docker tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

