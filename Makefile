.PHONY: help install build dev start clean test test-watch test-ui test-coverage test-all docker-build docker-build-dev docker-build-prod docker-run docker-stop docker-logs publish test-docker test-docker-full test-docker-config test-docker-compose docker-tag docker-push-hub docker-push-multiarch

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	yarn install

build: ## Build the project
	yarn build

dev: ## Run in development mode
	yarn dev

start: build ## Build and start the server
	node dist/index.js

clean: ## Clean build artifacts
	rm -rf dist node_modules coverage

test: ## Run all tests
	yarn test

test-watch: ## Run tests in watch mode
	yarn test:watch

test-ui: ## Run tests with UI
	yarn test:ui

test-coverage: ## Run tests with coverage report
	yarn test:coverage

test-all: test test-docker-full ## Run all tests including Docker

docker-build: ## Build Docker image
	docker build -t robiki/proxy:latest .

docker-build-dev: ## Build Docker image with dev dependencies (for testing)
	docker build --build-arg INSTALL_DEV_DEPS=true -t robiki/proxy:dev .

docker-build-prod: ## Build Docker image without dev dependencies (production)
	docker build --build-arg INSTALL_DEV_DEPS=false -t robiki/proxy:prod .

docker-run: ## Run Docker container
	docker-compose up -d

docker-stop: ## Stop Docker container
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f proxy

publish: build ## Publish to npm
	npm publish

# Docker publishing configuration
DOCKER_IMAGE_NAME ?= robiki/proxy
VERSION ?= $(shell node -p "require('./package.json').version")

docker-tag: ## Tag Docker image with version
	docker tag $(DOCKER_IMAGE_NAME):latest $(DOCKER_IMAGE_NAME):$(VERSION)

docker-push-hub: docker-build docker-tag ## Build and push to Docker Hub
	@echo "Pushing $(DOCKER_IMAGE_NAME):$(VERSION) and $(DOCKER_IMAGE_NAME):latest to Docker Hub..."
	docker push $(DOCKER_IMAGE_NAME):$(VERSION)
	docker push $(DOCKER_IMAGE_NAME):latest
	@echo "✓ Successfully pushed to Docker Hub"

docker-push-multiarch: ## Build and push multi-platform image (amd64 + arm64)
	@echo "Building and pushing multi-platform image..."
	@if ! docker buildx ls | grep -q multiarch; then \
		echo "Creating buildx builder 'multiarch'..."; \
		docker buildx create --name multiarch --driver docker-container --use; \
		docker buildx inspect --bootstrap; \
	else \
		docker buildx use multiarch; \
	fi
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t $(DOCKER_IMAGE_NAME):$(VERSION) \
		-t $(DOCKER_IMAGE_NAME):latest \
		--push \
		.
	@echo "✓ Successfully pushed multi-platform image to Docker Hub"

test-docker: docker-build ## Test Docker build
	docker run --rm robiki/proxy:latest node -e "console.log('Docker build successful')"

test-docker-full: ## Full Docker integration tests
	@echo "Running full Docker integration tests..."
	@./tests/docker/test-docker.sh

test-docker-config: ## Test proxy.config.json loading
	@echo "Testing configuration loading..."
	@./tests/docker/test-config-loading.sh

test-docker-compose: ## Test with docker-compose
	@echo "Testing with docker-compose..."
	@if [ ! -f proxy.config.json ]; then \
		echo "Creating test proxy.config.json..."; \
		echo '{"routes":{"test.local":{"target":"httpbin.org:80"}}}' > proxy.config.json; \
	fi
	docker-compose up -d
	@sleep 8
	@echo "Checking container status..."
	docker-compose ps
	@echo "Checking logs..."
	docker-compose logs proxy
	docker-compose down

.DEFAULT_GOAL := help

