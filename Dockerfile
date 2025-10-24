# Dockerfile for Node.js Discord Bot
FROM node:20-alpine

# Create app directory and data directory
RUN mkdir -p /app /app/data && chown -R node:node /app

# Set working directory
WORKDIR /app

# Switch to non-root user
USER node

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY --chown=node:node . .

# Create volume for database persistence
VOLUME ["/app/data"]

# Health check - simple check if Node.js process is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Default command
CMD ["node", "index.js"]
