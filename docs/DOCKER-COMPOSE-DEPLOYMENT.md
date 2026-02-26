# VaxTrace Nigeria - Docker Compose Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying VaxTrace Nigeria using Docker Compose on Galaxy Backbone (GxCP) infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [GxCP Production Deployment](#gxcp-production-deployment)
4. [Service Architecture](#service-architecture)
5. [Environment Configuration](#environment-configuration)
6. [Deployment Commands](#deployment-commands)
7. [Health Monitoring](#health-monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| Docker | 24.0+ | [docker.com](https://docs.docker.com/engine/install/) |
| Docker Compose | 2.20+ | Included with Docker Desktop |
| OpenSSL | 3.0+ | For TLS certificate generation |

### System Requirements

**Minimum for Development:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 20 GB

**Recommended for Production (GxCP):**
- CPU: 8 cores
- RAM: 16 GB
- Disk: 100 GB SSD

---

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/vaxtrace-nigeria.git
cd vaxtrace-nigeria

# Copy environment template
cp .env.gxcp.example .env

# Edit .env with your values
nano .env
```

### 2. Generate Secrets

```bash
# Generate secure passwords
openssl rand -base64 32 > /tmp/postgres_password.txt
openssl rand -base64 32 > /tmp/redis_password.txt
openssl rand -base64 64 > /tmp/jwt_secret.txt
openssl rand -hex 32 > /tmp/encryption_key.txt

# Display generated secrets
cat /tmp/postgres_password.txt
cat /tmp/redis_password.txt
cat /tmp/jwt_secret.txt
cat /tmp/encryption_key.txt
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## GxCP Production Deployment

### Step 1: Prepare GxCP Environment

```bash
# Set production environment
export NODE_ENV=production
export BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Use GxCP environment template
cp .env.gxcp.example .env
```

### Step 2: Configure TLS Certificates

```bash
# Create TLS directory
mkdir -p backend/config/tls

# Option A: Use GBB-provided certificates
cp /path/to/gbb/certs/vaxtrace.crt backend/config/tls/
cp /path/to/gbb/certs/vaxtrace.key backend/config/tls/
cp /path/to/gbb/certs/gbb-ca.crt backend/config/tls/

# Option B: Generate self-signed certificates (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout backend/config/tls/vaxtrace.key \
  -out backend/config/tls/vaxtrace.crt \
  -subj "/C=NG/ST=Abuja/L=Abuja/O=VaxTrace/CN=vaxtrace.gov.ng"
```

### Step 3: Build Production Images

```bash
# Build all images with production tags
docker-compose build --parallel

# Tag images for GxCP registry
docker tag vaxtrace-backend:latest registry.galaxybackbone.com/vaxtrace/backend:latest
docker tag vaxtrace-frontend:latest registry.galaxybackbone.com/vaxtrace/frontend:latest
docker tag vaxtrace-nginx:latest registry.galaxybackbone.com/vaxtrace/nginx:latest
```

### Step 4: Deploy to GxCP

```bash
# Login to GxCP registry
docker login registry.galaxybackbone.com

# Push images
docker push registry.galaxybackbone.com/vaxtrace/backend:latest
docker push registry.galaxybackbone.com/vaxtrace/frontend:latest
docker push registry.galaxybackbone.com/vaxtrace/nginx:latest

# Start production stack
docker-compose -f docker-compose.yml --env-file .env up -d

# Verify deployment
docker-compose ps
docker-compose logs --tail=50
```

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VaxTrace Docker Stack                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │   Nginx     │────│  Frontend    │    │   Backend    │        │
│  │  :80/:443   │    │  Next.js     │    │   NestJS     │        │
│  │  (m1.small) │    │ (m1.medium)  │    │  (m1.large)  │        │
│  └─────────────┘    └──────────────┘┘    └──────┬───────┘        │
│                                                 │                 │
│                         ┌───────────────────────┼─────────────┐  │
│                         │                       │             │  │
│                  ┌──────▼──────┐        ┌──────▼──────┐       │  │
│                  │  PostgreSQL │        │    Redis    │       │  │
│                  │  + PostGIS  │        │   Cache     │       │  │
│                  │ (m1.xlarge) │        │  (m1.large) │       │  │
│                  └─────────────┘        └─────────────┘       │  │
│                                                                   │
│  Development Tools (--profile development):                       │
│  ┌──────────┐  ┌─────────────────┐                               │
│  │ pgAdmin  │  │ Redis Commander │                               │
│  └──────────┘  └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Resource Allocation

| Service | CPU Limit | Memory Limit | Purpose |
|---------|-----------|--------------|---------|
| **Backend** | 3.5 cores | 7 GB | NestJS API server |
| **Frontend** | 1.5 cores | 3.5 GB | Next.js web app |
| **Nginx** | 0.8 cores | 1.5 GB | Reverse proxy |
| **PostgreSQL** | - | 16 GB | Database (m1.xlarge) |
| **Redis** | - | 8 GB | Cache (m1.large) |

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
POSTGRES_PASSWORD=<required>
POSTGRES_USER=vaxtrace_admin
POSTGRES_DB=vaxtrace_nigeria

# Redis
REDIS_PASSWORD=<required>

# Security
JWT_SECRET=<required, min 64 chars>
ENCRYPTION_KEY=<required, 64 hex chars>
WEBHOOK_SECRET=<required>

# OpenLMIS
OPENLMIS_CLIENT_SECRET=<required>

# Monitoring
SENTRY_DSN=<optional>
POSTHOG_KEY=<optional>
```

### GxCP-Specific Variables

```bash
# GBB Cloud Infrastructure
GBB_AUTH_URL=https://api.galaxybackbone.com:5000/v3
GBB_TENANT_NAME=vaxtrace-production
GBB_REGION=ng-abuja

# Resource Limits
BACKEND_CPU_LIMIT=3.5
BACKEND_MEMORY_LIMIT=7G
FRONTEND_CPU_LIMIT=1.5
FRONTEND_MEMORY_LIMIT=3.5G
NGINX_CPU_LIMIT=0.8
NGINX_MEMORY_LIMIT=1.5G
```

---

## Deployment Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# View logs
docker-compose logs -f [service]

# Scale services (for horizontal scaling)
docker-compose up -d --scale backend=3
```

### Development Mode

```bash
# Start with development tools
docker-compose --profile development up -d

# Access pgAdmin at http://localhost:5050
# Access Redis Commander at http://localhost:8081
```

### Production Deployment

```bash
# Build and start production stack
docker-compose -f docker-compose.yml --env-file .env up -d --build

# Run database migrations
docker-compose exec backend npm run migration:run

# Seed initial data
docker-compose exec backend npm run seed:run
```

---

## Health Monitoring

### Health Check Endpoints

| Service | Endpoint | Status |
|---------|----------|--------|
| Nginx | `GET /health` | HTTP 200 |
| Frontend | `GET /api/health` | HTTP 200 |
| Backend | `GET /health` | HTTP 200 |
| PostgreSQL | `pg_isready` | TCP 5432 |
| Redis | `redis-cli ping` | TCP 6379 |

### Monitoring Commands

```bash
# Check all service health
docker-compose ps

# View resource usage
docker stats

# Check service logs
docker-compose logs --tail=100 -f backend

# Health check script
./scripts/health-check.sh
```

---

## Troubleshooting

### Common Issues

#### 1. Services Not Starting

```bash
# Check logs
docker-compose logs [service]

# Verify environment variables
docker-compose config

# Check port conflicts
netstat -tuln | grep -E ':(3000|8000|5432|6379|80|443)'
```

#### 2. Database Connection Issues

```bash
# Verify PostgreSQL is healthy
docker-compose exec postgres pg_isready -U vaxtrace_admin

# Check database logs
docker-compose logs postgres

# Test connection from backend
docker-compose exec backend sh -c 'nc -zv postgres 5432'
```

#### 3. Redis Connection Issues

```bash
# Verify Redis is healthy
docker-compose exec redis redis-cli -a $REDIS_PASSWORD ping

# Check Redis logs
docker-compose logs redis
```

#### 4. Nginx Configuration Issues

```bash
# Test nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx
docker-compose exec nginx nginx -s reload
```

### Recovery Commands

```bash
# Rebuild specific service
docker-compose up -d --build backend

# Reset database (CAUTION: deletes data)
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend npm run migration:run

# Clear Redis cache
docker-compose exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

---

## Maintenance

### Backup Procedures

```bash
# Backup PostgreSQL database
docker-compose exec postgres pg_dump -U vaxtrace_admin vaxtrace_nigeria \
  > backup_$(date +%Y%m%d).sql

# Backup to volume
docker-compose exec postgres sh -c '
  pg_dump -U vaxtrace_admin vaxtrace_nigeria \
  > /var/lib/postgresql/data/backup_$(date +%Y%m%d).sql
'

# Automated backup script
./scripts/backup-db.sh
```

### Update Procedures

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose build

# Restart services with zero downtime
docker-compose up -d --no-deps --build backend frontend
docker-compose up -d --no-deps --build nginx

# Run migrations
docker-compose exec backend npm run migration:run
```

### Cleanup

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAUTION: deletes data)
docker volume prune

# Clean build cache
docker builder prune
```

---

## Security Considerations

### Production Checklist

- [ ] All passwords are 32+ characters
- [ ] JWT_SECRET is 64+ characters
- [ ] TLS certificates are valid
- [ ] Firewall rules configured
- [ ] Database access restricted
- [ ] Redis password protected
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Sentry error tracking configured
- [ ] Log rotation configured

### GxCP Security Notes

1. **Network Isolation**: Use GBB security groups to restrict access
2. **TLS Termination**: Nginx handles SSL/TLS at edge
3. **Secrets Management**: Use GBB Vault or environment variables
4. **Access Logs**: Enable nginx access logging for audit trails
5. **Backup Encryption**: Encrypt backups at rest using GBB key management

---

## Support

For issues specific to GxCP deployment:
- GBB Cloud Support: support@galaxybackbone.com
- VaxTrace Documentation: [docs/](docs/)
- Issue Tracker: [GitHub Issues](https://github.com/your-org/vaxtrace-nigeria/issues)
