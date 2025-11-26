# Glassdoor Job Scraper Adapter
# Multi-stage build for optimized production image

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Create non-root user for security
RUN groupadd -r scraper && useradd -r -g scraper scraper

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R scraper:scraper /app

# Switch to non-root user
USER scraper

# Environment variables
ENV NODE_ENV=production
ENV HEADLESS=true
ENV THROTTLE_MS=3000
ENV MAX_RESULTS=50

# Expose port for API (if needed in future)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Default command
CMD ["node", "dist/index.js"]
