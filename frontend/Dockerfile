# VaxTrace Nigeria - Frontend Dockerfile
# Multi-stage build for Next.js 14 frontend with PWA capabilities
# Optimized for production deployment on GBB Cloud OpenStack infrastructure

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && \
    npm cache clean --force

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Copy source code
COPY src ./src
COPY public ./public

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG BUILD_DATE
ARG NEXT_PUBLIC_MAPBOX_TOKEN=""

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN} \
    BUILD_DATE=${BUILD_DATE} \
    NODE_ENV=production

# Build the application
RUN npm run build

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
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

# Copy production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./

# Set ownership
RUN chown -R vaxtrace:vaxtrace /app

# Switch to non-root user
USER vaxtrace

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "node_modules/next/dist/bin/next", "start"]
