# Multi-stage build for LinkedIn Job Scraper Adapter
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Production stage with Playwright
FROM mcr.microsoft.com/playwright:v1.40.0-jammy as production

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r scraper && useradd -r -g scraper scraper

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy base types
COPY --from=builder /app/../base ./base
COPY --from=builder /app/../types ./types

# Install Playwright browsers (Chromium only for smaller image)
RUN npx playwright install chromium --with-deps

# Create output directory
RUN mkdir -p /app/output && chown -R scraper:scraper /app

# Switch to non-root user
USER scraper

# Environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV THROTTLE_MS=3000
ENV MAX_RESULTS=50

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command
CMD ["node", "dist/index.js"]
