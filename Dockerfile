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

# Install dependencies
RUN yarn install --frozen-lockfile --silent --non-interactive && yarn cache clean --force

# Copy source code
COPY ./src ./src/

# Create directories for certificates and config
RUN mkdir -p /usr/src/certs

# Set environment variables
ENV PATH=/usr/src/node_modules/.bin:$PATH
ENV NODE_PATH=.
ENV NODE_ENV=production

# Expose ports
EXPOSE 443 8080 9229

# Set ownership for non-root user
RUN chown -R node:node /usr/src

# Drop to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/robiki-proxy/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the proxy with dumb-init using tsx to run TypeScript directly
CMD ["dumb-init", "tsx", "src/index.ts"]

