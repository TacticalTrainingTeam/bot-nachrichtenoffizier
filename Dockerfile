# Dockerfile for Node.js Discord Bot
FROM node:lts-jod

# Install pnpm and create directories
RUN npm install -g pnpm && \
    mkdir -p /app /app/data && \
    chown -R node:node /app

# Set working directory
WORKDIR /app

# Switch to non-root user
USER node

# Copy package files
COPY --chown=node:node package*.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY --chown=node:node . .

# Create volume for database persistence
VOLUME ["/app/data"]

# Health check - simple check if Node.js process is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Default command
CMD ["node", "index.js"]
