FROM node:24.12.0-bullseye-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src

# Copy in base project files and the restart script
COPY ./package.json ./yarn.lock ./tsconfig.json ./

# Install Node dependencies
RUN npm i -g tsx
RUN yarn install --pure-lockfile --silent --non-interactive --ignore-scripts --ignore-optional && yarn cache clean --force

# Set environment variables
ENV PATH=/usr/src/node_modules/.bin:$PATH
ENV NODE_PATH=.

# Copy in source code
COPY ./src ./src/

# Expose needed ports
EXPOSE 443 8080 9229

# Set script executable and fix ownership
RUN chmod +x ./scripts/watch.sh && chown -R node:node /usr/src/services

# Drop to non-root user
USER node

# Start the proxy
CMD dumb-init node ./dist/index.js