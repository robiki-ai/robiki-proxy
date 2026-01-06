.PHONY: help install build dev start clean test test-watch test-ui test-coverage test-all docker-build docker-build-dev docker-build-prod docker-run docker-stop docker-logs publish test-docker test-docker-full test-docker-config test-docker-compose

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
	npm publish --access public

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

