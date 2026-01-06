.PHONY: help install build dev start clean docker-build docker-run docker-stop publish

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
	rm -rf dist node_modules

docker-build: ## Build Docker image
	docker build -t robiki/proxy:latest .

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

.DEFAULT_GOAL := help

