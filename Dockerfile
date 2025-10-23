# Dockerfile for Node.js Discord Bot
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN pnpm install --production

# Copy source code
COPY . .

# Default command (can be changed if needed)
CMD ["node", "index.js"]
