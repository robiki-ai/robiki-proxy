# Builder stage
FROM node:24-bullseye-slim AS builder

# Build argument to control dependency installation
ARG INSTALL_DEV_DEPS=true

# Set working directory
WORKDIR /usr/src

# Copy package files
COPY package.json yarn.lock tsconfig.json ./

# Install dependencies (conditionally include dev deps based on build arg)
RUN if [ "$INSTALL_DEV_DEPS" = "true" ]; then \
      echo "Installing all dependencies (including dev)..." && \
      yarn install --frozen-lockfile --silent --non-interactive && yarn cache clean --force; \
    else \
      echo "Installing production dependencies..." && \
      yarn install --frozen-lockfile --production --silent --non-interactive && yarn cache clean --force; \
    fi

# Copy source code
COPY ./src ./src/

# Build the application (if dev deps are installed)
RUN if [ "$INSTALL_DEV_DEPS" = "true" ]; then \
      yarn build; \
    else \
      echo "Skipping build - no dev dependencies"; \
    fi

# Production stage
FROM node:24-bullseye-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production --silent --non-interactive --ignore-scripts --ignore-optional && yarn cache clean --force

# Copy built files from builder
COPY --from=builder /usr/src/dist ./dist

# Create directory for certificates
RUN mkdir -p /usr/src/certs

# Set environment variables
ENV PATH=/usr/src/node_modules/.bin:$PATH
ENV NODE_PATH=.
ENV NODE_ENV=production
ENV PROXY_CONFIG=/usr/src/proxy.config.json

# Expose ports
EXPOSE 443 8080 9229

# Set ownership for non-root user
RUN chown -R node:node /usr/src

# Drop to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the proxy with dumb-init
CMD ["dumb-init", "node", "dist/index.js"]

