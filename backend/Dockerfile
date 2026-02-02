# VaxTrace Nigeria - Backend Dockerfile
# Multi-stage build for NestJS backend with PostgreSQL, Redis, and OpenLMIS integration
# Optimized for production deployment on GBB Cloud OpenStack infrastructure

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Copy source code
COPY src ./src
COPY protos ./protos

# Build the application
RUN npm run build

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    openssl \
    curl \
    tzdata

# Set timezone
ENV TZ=Africa/Lagos

# Create non-root user for security
RUN addgroup -g 1001 -S vaxtrace && \
    adduser -S -u 1001 -G vaxtrace vaxtrace

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist

# Copy protobuf schemas
COPY protos ./protos

# Copy database migrations
COPY database ./database

# Set ownership
RUN chown -R vaxtrace:vaxtrace /app

# Switch to non-root user
USER vaxtrace

# Expose application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Environment variables
ENV NODE_ENV=production \
    PORT=8000

# Start the application
CMD ["node", "dist/main.js"]
