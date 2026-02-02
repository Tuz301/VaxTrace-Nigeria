# VaxTrace Nigeria - Nginx Reverse Proxy Dockerfile
# Production-ready reverse proxy with SSL/TLS termination, caching, and security headers
# Optimized for GBB Cloud OpenStack infrastructure

FROM nginx:1.25-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    tzdata

# Set timezone
ENV TZ=Africa/Lagos

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create non-root user for security
RUN addgroup -g 1001 -S vaxtrace && \
    adduser -S -u 1001 -G vaxtrace vaxtrace && \
    chown -R vaxtrace:vaxtrace /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Switch to non-root user
USER vaxtrace

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
