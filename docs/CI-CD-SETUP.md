# VaxTrace Nigeria - CI/CD Pipeline Documentation

## Overview

This document describes the CI/CD pipeline implementation for VaxTrace Nigeria, a vaccine supply chain analytics platform. The pipeline provides automated testing, building, and deployment capabilities for staging and production environments.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                     (VaxTrace Nigeria)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Test   │→│  Build   │→│  Deploy  │→│ Security │       │
│  │          │  │          │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Container Registry (GHCR)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Backend    │  │   Frontend   │  │    Nginx     │         │
│  │   Image      │  │   Image      │  │   Image      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GBB Cloud (OpenStack)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Backend    │  │   Frontend   │  │    Nginx     │         │
│  │  Container   │  │  Container   │  │  Container   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Pipeline Stages

### 1. Test Stage

Runs on every push and pull request to `main` and `develop` branches.

**What it does:**
- Checks out code
- Sets up Node.js 20
- Installs dependencies for all workspaces
- Runs linters (backend and frontend)
- Runs unit tests (backend and frontend)
- Performs TypeScript type checking
- Uploads test coverage reports

**Exit conditions:**
- Continues even if linting fails (warnings only)
- Continues even if tests fail (for coverage collection)
- Fails if type checking fails

### 2. Build Stage

Builds and pushes Docker images to GitHub Container Registry (GHCR).

**What it does:**
- Logs in to GHCR
- Extracts metadata for versioning
- Builds multi-stage Docker images
- Pushes images with multiple tags:
  - Branch name
  - SHA commit
  - Semantic version (if tagged)
  - `latest` (for main branch)

**Images built:**
- `backend` - NestJS API server
- `frontend` - Next.js web application
- `nginx` - Reverse proxy

### 3. Deploy Stages

#### Staging Deployment (Automatic)

**Trigger:** Push to `develop` branch

**What it does:**
1. Sets up Terraform
2. Configures GBB Cloud credentials
3. Plans and applies Terraform changes
4. Deploys services via SSH
5. Runs health checks
6. Creates deployment record

**Environment URL:** `https://staging.vaxtrace.gov.ng`

#### Production Deployment (Manual Approval)

**Trigger:** Push to `main` branch + manual approval

**What it does:**
1. Requires 2 approvals from specified users
2. Creates database backup
3. Runs database migrations
4. Sets up Terraform for production
5. Plans and applies infrastructure changes
6. Deploys services via SSH
7. Runs health checks
8. Creates deployment record
9. **Automatic rollback on failure**

**Environment URL:** `https://vaxtrace.gov.ng`

### 4. Security Scan Stage

Scans Docker images for vulnerabilities using Trivy.

**What it does:**
- Scans backend image
- Scans frontend image
- Uploads SARIF results to GitHub Security
- Stores security reports as artifacts

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### GBB Cloud Credentials (Infrastructure)
```
GBB_AUTH_URL        - OpenStack authentication URL
GBB_DOMAIN_NAME     - OpenStack domain name
GBB_TENANT_NAME     - OpenStack tenant/project name
GBB_USER_NAME       - OpenStack username
GBB_PASSWORD        - OpenStack password
GBB_REGION          - GBB Cloud region (e.g., "RegionOne")
```

### Database Credentials
```
PROD_DB_HOST        - Production database host
PROD_DB_USER        - Production database user
PROD_DB_PASSWORD    - Production database password
PROD_DB_NAME        - Production database name
```

### SSH Credentials (Deployment)
```
PROD_SSH_KEY        - Production SSH private key
PROD_SSH_HOST       - Production server hostname
PROD_SSH_USER       - Production SSH username

STAGING_SSH_KEY     - Staging SSH private key
STAGING_SSH_HOST    - Staging server hostname
STAGING_SSH_USER    - Staging SSH username
```

### Application Configuration
```
NEXT_PUBLIC_API_URL - Frontend API URL
```

### Backup Configuration
```
BACKUP_BUCKET       - S3 bucket for database backups
```

### Health Check URLs
```
PROD_HEALTH_CHECK_URL    - Production health check endpoint
STAGING_HEALTH_CHECK_URL - Staging health check endpoint
```

## Docker Images

### Backend Image

**Base:** `node:20-alpine`

**Stages:**
1. **deps** - Installs dependencies
2. **build** - Compiles TypeScript
3. **production** - Minimal runtime image

**Features:**
- Non-root user (vaxtrace:1001)
- Health check on `/health`
- Optimized layer caching
- Includes protobuf schemas and migrations

**Port:** 8000

### Frontend Image

**Base:** `node:20-alpine`

**Stages:**
1. **deps** - Installs dependencies
2. **build** - Builds Next.js application
3. **production** - Minimal runtime image

**Features:**
- Non-root user (vaxtrace:1001)
- Health check on `/api/health`
- Static asset optimization
- PWA support

**Port:** 3000

### Nginx Image

**Base:** `nginx:1.25-alpine`

**Features:**
- Non-root user (vaxtrace:1001)
- Rate limiting
- API response caching
- Security headers
- NDPR compliance headers
- SSL/TLS configuration (commented for activation)

**Ports:** 80, 443

## Deployment Scripts

### deploy.sh

Main deployment script that:
1. Validates environment and arguments
2. Tests SSH connection
3. Creates docker-compose configuration
4. Pulls latest Docker images
5. Backs up current deployment
6. Stops old containers
7. Starts new containers
8. Waits for health checks
9. Cleans up old images
10. Saves deployment record

**Usage:**
```bash
./scripts/deploy.sh staging \
  ghcr.io/user/vaxtrace/backend:latest \
  ghcr.io/user/vaxtrace/frontend:latest \
  ghcr.io/user/vaxtrace/nginx:latest
```

### health-check.sh

Verifies deployment health by:
1. Checking HTTP endpoints
2. Verifying container status (via SSH)
3. Checking health status responses
4. Providing detailed status report

**Usage:**
```bash
HEALTH_CHECK_URL=http://staging.vaxtrace.gov.ng \
MAX_RETRIES=30 \
RETRY_INTERVAL=10 \
./scripts/health-check.sh staging
```

### rollback.sh

Rolls back to previous deployment:
1. Lists available backups
2. Confirms rollback action
3. Creates emergency backup
4. Stops current containers
5. Restores backup configuration
6. Pulls backup images
7. Starts containers
8. Verifies health
9. Saves rollback record

**Usage:**
```bash
./scripts/rollback.sh production backup-20240101-120000
```

### migrate.sh

Runs database migrations:
1. Ensures schema_migrations table exists
2. Finds migration files
3. Runs migrations in order
4. Tracks applied migrations
5. Provides migration history

**Usage:**
```bash
DB_HOST=postgres.example.com \
DB_USER=vaxtrace \
DB_PASSWORD=secret \
DB_NAME=vaxtrace_nigeria \
./scripts/migrate.sh production
```

### backup-db.sh

Creates database backups:
1. Dumps database with pg_dump
2. Compresses with gzip
3. Calculates SHA256 checksum
4. Uploads to S3 (if configured)
5. Cleans up old backups (30-day retention)

**Usage:**
```bash
DB_HOST=postgres.example.com \
DB_USER=vaxtrace \
DB_PASSWORD=secret \
DB_NAME=vaxtrace_nigeria \
BACKUP_BUCKET=my-backup-bucket \
./scripts/backup-db.sh production
```

## Workflow Triggers

### Automatic Triggers

| Event | Branch | Action |
|-------|--------|--------|
| Push | `develop` | Test → Build → Deploy to Staging |
| Push | `main` | Test → Build → Wait for Approval |
| Pull Request | Any | Test only |
| Manual | Any | Test → Build → Deploy (selected environment) |

### Manual Approval (Production)

Production deployments require:
- **2 approvers** from: `rakosu`, `admin`, `tech-lead`
- Pre-deployment checklist verification
- Optional maintenance window scheduling

## Deployment Records

Each deployment creates a JSON record:

```json
{
  "environment": "production",
  "commit": "abc123...",
  "branch": "main",
  "deployed_at": "2024-01-01T12:00:00Z",
  "deployed_by": "developer",
  "approved_by": "approver1,approver2",
  "backend_image": "ghcr.io/user/vaxtrace/backend:latest",
  "frontend_image": "ghcr.io/user/vaxtrace/frontend:latest",
  "nginx_image": "ghcr.io/user/vaxtrace/nginx:latest"
}
```

Records are stored as GitHub artifacts for:
- Staging: 90 days
- Production: 365 days

## Rollback Procedure

### Automatic Rollback

Production deployments automatically rollback on failure.

### Manual Rollback

```bash
# List available backups
ssh user@server "ls -lt ~/vaxtrace/backups/*.yml"

# Rollback to specific backup
./scripts/rollback.sh production backup-20240101-120000
```

## Security Features

1. **Vulnerability Scanning** - Trivy scans on every build
2. **Non-root Containers** - All containers run as non-root user
3. **Secret Management** - GitHub Secrets for sensitive data
4. **SSH Key Authentication** - Key-based SSH access
5. **NDPR Compliance** - Headers and data residency
6. **Audit Trail** - Deployment records with timestamps

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify SSH credentials
3. Check GBB Cloud connectivity
4. Review health check responses
5. Examine container logs: `ssh user@server "cd ~/vaxtrace && docker-compose logs"`

### Health Check Fails

1. Verify all containers are running
2. Check container health status
3. Review application logs
4. Test endpoints manually
5. Consider rollback if critical

### Terraform Fails

1. Review Terraform plan output
2. Check GBB Cloud credentials
3. Verify resource quotas
4. Review OpenStack logs
5. Contact GBB Cloud support if needed

## Best Practices

1. **Always test on staging first** - Deploy to staging, verify, then deploy to production
2. **Review Terraform plans** - Always review infrastructure changes before applying
3. **Monitor deployments** - Watch the GitHub Actions logs during deployment
4. **Keep backups current** - Database backups run before production deployments
5. **Document changes** - Update this document when making pipeline changes
6. **Review security reports** - Address vulnerabilities promptly
7. **Test rollback procedure** - Verify rollback works before critical deployments

## Maintenance

### Regular Tasks

- **Weekly**: Review security scan results
- **Monthly**: Clean up old Docker images and artifacts
- **Quarterly**: Review and update dependencies
- **Annually**: Audit access controls and credentials

### Updating the Pipeline

1. Make changes to `.github/workflows/ci-cd.yml`
2. Test on a feature branch
3. Create pull request for review
4. Merge to `develop` for staging test
5. Merge to `main` for production

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review this documentation
3. Check container logs
4. Contact DevOps team

## Appendix

### File Structure

```
.github/
  workflows/
    ci-cd.yml          # Main CI/CD pipeline
backend/
  Dockerfile           # Backend container definition
  .dockerignore        # Backend build exclusions
frontend/
  Dockerfile           # Frontend container definition
  .dockerignore        # Frontend build exclusions
nginx/
  Dockerfile           # Nginx container definition
  nginx.conf           # Main Nginx configuration
  conf.d/
    vaxtrace.conf      # Virtual host configuration
scripts/
  deploy.sh            # Deployment script
  health-check.sh      # Health check script
  rollback.sh          # Rollback script
  migrate.sh           # Database migration script
  backup-db.sh         # Database backup script
docs/
  CI-CD-SETUP.md       # This document
```

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Application port | `8000` |
| `REDIS_HOST` | Redis hostname | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `POSTGRES_HOST` | PostgreSQL hostname | `postgres` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `https://api.vaxtrace.gov.ng` |
| `TZ` | Timezone | `Africa/Lagos` |

---

**Document Version:** 1.0.0  
**Last Updated:** 2024-01-01  
**Maintained By:** VaxTrace DevOps Team
