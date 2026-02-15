# VaxTrace Nigeria - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying VaxTrace Nigeria to production on Galaxy Backbone (GBB) Cloud infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Application Deployment](#application-deployment)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Rollback Procedures](#rollback-procedures)
7. [Maintenance & Operations](#maintenance--operations)

---

## Prerequisites

### Required Accounts & Access

1. **Galaxy Backbone (GBB) Cloud Account**
   - OpenStack credentials
   - Project/tenant: `vaxtrace-production`
   - Region: `ng-abuja` (primary) or `ng-kano` (DR)

2. **GitHub Repository Access**
   - Repository: `VaxTrace Nigeria`
   - Write access for deployments
   - GitHub Container Registry (GHCR) access

3. **Domain & DNS**
   - Domain: `vaxtrace.gov.ng`
   - DNS management access
   - SSL/TLS certificates

### Required Tools

Install these tools locally:

```bash
# Terraform (Infrastructure as Code)
# Download from: https://www.terraform.io/downloads.html
terraform version  # Should be >= 1.5.0

# OpenStack CLI (optional, for direct GBB management)
pip install python-openstackclient

# Docker & Docker Compose
docker --version
docker-compose --version

# kubectl (if using Kubernetes)
kubectl version --client
```

### Required Secrets

Prepare these values before deployment (store in password manager):

| Secret | Description | Example |
|--------|-------------|---------|
| `GBB_AUTH_URL` | GBB OpenStack auth URL | `https://api.galaxybackbone.com:5000/v3` |
| `GBB_USER_NAME` | GBB service account username | `vaxtrace-service` |
| `GBB_PASSWORD` | GBB service account password | `<generate strong password>` |
| `GBB_TENANT_NAME` | GBB project/tenant name | `vaxtrace-production` |
| `POSTGRES_PASSWORD` | Database admin password | `<generate 32-char password>` |
| `REDIS_PASSWORD` | Redis password | `<generate 32-char password>` |
| `JWT_SECRET` | JWT signing secret | `<generate 64-char secret>` |
| `ENCRYPTION_KEY` | AES-256 encryption key | `<generate 64-char hex key>` |
| `WEBHOOK_SECRET` | Webhook signature verification | `<generate 64-char secret>` |
| `OPENLMIS_CLIENT_SECRET` | OpenLMIS OAuth2 secret | `<from OpenLMIS provider>` |
| `SENTRY_DSN` | Sentry error tracking DSN | `https://...@sentry.io/...` |
| `POSTHOG_KEY` | PostHog analytics key | `phc_...` |

---

## Infrastructure Setup

### Step 1: Configure Terraform Variables

Create a `terraform.tfvars` file in `infrastructure/terraform/`:

```hcl
# ============================================
# GBB Cloud Credentials
# ============================================
gbb_auth_url    = "https://api.galaxybackbone.com:5000/v3"
gbb_domain_name = "Default"
gbb_tenant_name = "vaxtrace-production"
gbb_user_name   = "vaxtrace-service"
gbb_password    = "<your-gbb-password>"
gbb_region      = "ng-abuja"

# ============================================
# Network Configuration
# ============================================
private_subnet_cidr = "10.0.0.0/24"
app_server_cidr    = "10.0.0.0/24"
bastion_cidr       = "10.0.1.0/24"
dns_servers        = ["8.8.8.8", "8.8.4.4"]

# ============================================
# PostgreSQL Configuration
# ============================================
postgres_image_name  = "ubuntu-22.04-postgis-16"
postgres_flavor_name = "m1.xlarge"  # 8 vCPU, 16GB RAM
postgres_storage_size = 500        # GB
postgres_storage_type  = "ssd"

# ============================================
# Redis Configuration
# ============================================
redis_image_name  = "alpine-3.19-redis"
redis_flavor_name = "m1.large"  # 4 vCPU, 8GB RAM
redis_storage_size = 50         # GB
redis_storage_type  = "ssd"

# ============================================
# Availability Zones
# ============================================
gbb_primary_az = "abuja-zone-1"
gbb_dr_az      = "kano-zone-1"

# ============================================
# Security
# ============================================
ssh_key_name = "vaxtrace-prod-key"

# ============================================
# Environment
# ============================================
environment = "production"

# ============================================
# Backup Configuration
# ============================================
backup_retention_days = 2555  # 7 years (NDPR requirement)
backup_schedule        = "0 2 * * *"  # Daily at 2 AM

# ============================================
# Monitoring
# ============================================
enable_monitoring      = true
monitoring_alert_email = "ops@vaxtrace.ng"
```

### Step 2: Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform (downloads providers)
terraform init

# Validate configuration
terraform validate

# Format configuration files
terraform fmt -recursive
```

### Step 3: Review Infrastructure Plan

```bash
# Create execution plan
terraform plan -out=vaxtrace-production.plan

# Review the plan carefully:
# - Resources to be created
# - Security group rules
# - Network configuration
# - Storage volumes
# - Cost estimates
```

### Step 4: Deploy Infrastructure

```bash
# Apply the plan
terraform apply vaxtrace-production.plan

# Confirm when prompted
# Wait for infrastructure provisioning (5-10 minutes)

# Save outputs for application configuration
terraform output -json > infrastructure-outputs.json
```

### Step 5: Verify Infrastructure

```bash
# Check PostgreSQL instance
openstack server list --name vaxtrace-postgres-primary

# Check Redis instance
openstack server list --name vaxtrace-redis

# Check network
openstack network list --name vaxtrace-private-network

# Check security groups
openstack security group list --name vaxtrace-postgres-sg
```

---

## Application Deployment

### Step 1: Configure GitHub Secrets

Navigate to: **GitHub Repository → Settings → Secrets and variables → Actions**

Add the following secrets:

#### GBB Cloud Credentials
```
GBB_AUTH_URL        = https://api.galaxybackbone.com:5000/v3
GBB_DOMAIN_NAME     = Default
GBB_TENANT_NAME     = vaxtrace-production
GBB_USER_NAME       = vaxtrace-service
GBB_PASSWORD        = <your-gbb-password>
GBB_REGION          = ng-abuja
```

#### Database Credentials (from Terraform outputs)
```
PROD_DB_HOST        = <from terraform output postgres_primary_ip>
PROD_DB_PORT        = 5432
PROD_DB_USER        = vaxtrace_admin
PROD_DB_PASSWORD    = <from terraform output postgres_password>
PROD_DB_NAME        = vaxtrace_nigeria
```

#### Redis Credentials (from Terraform outputs)
```
REDIS_HOST          = <from terraform output redis_ip>
REDIS_PORT          = 6379
REDIS_PASSWORD      = <from terraform output redis_password>
REDIS_TLS           = true
```

#### Application Secrets
```
JWT_SECRET          = <generate 64-char secret>
JWT_EXPIRES_IN      = 1h
JWT_REFRESH_EXPIRES_IN = 7d
ENCRYPTION_KEY      = <generate 64-char hex key>
WEBHOOK_SECRET      = <generate 64-char secret>
```

#### OpenLMIS Integration
```
OPENLMIS_BASE_URL           = https://openlmis.example.org
OPENLMIS_CLIENT_ID          = vaxtrace-service-account
OPENLMIS_CLIENT_SECRET      = <from OpenLMIS provider>
OPENLMIS_USERNAME           = vaxtrace-service@example.org
OPENLMIS_PASSWORD           = <from OpenLMIS provider>
```

#### Monitoring & Analytics
```
SENTRY_DSN              = https://<key>@sentry.io/<project>
NEXT_PUBLIC_SENTRY_DSN  = https://<key>@sentry.io/<project>
NEXT_PUBLIC_POSTHOG_KEY = phc_<project-key>
NEXT_PUBLIC_POSTHOG_HOST = https://app.posthog.com
```

#### Deployment Configuration
```
PROD_SSH_KEY         = <paste SSH private key>
PROD_SSH_HOST        = <from terraform output postgres_floating_ip>
PROD_SSH_USER        = ubuntu
NEXT_PUBLIC_API_URL  = https://api.vaxtrace.gov.ng
NEXT_PUBLIC_WS_URL   = wss://api.vaxtrace.gov.ng
BACKUP_BUCKET        = vaxtrace-backups
```

#### Health Check URLs
```
PROD_HEALTH_CHECK_URL     = https://api.vaxtrace.gov.ng/health
STAGING_HEALTH_CHECK_URL  = https://staging.vaxtrace.gov.ng/health
```

### Step 2: Push to Main Branch

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "chore: prepare for production deployment"

# Push to main branch
git push origin main
```

### Step 3: Trigger Production Deployment

1. Navigate to: **GitHub Repository → Actions**
2. Find the workflow: **Deploy to Production**
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

### Step 4: Approve Deployment

Production deployment requires **2 approvals**:

1. First approver: Review and approve
2. Second approver: Review and approve

**Pre-deployment checklist:**
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Staging deployment verified
- [ ] Database backups enabled
- [ ] Monitoring configured
- [ ] Rollback plan ready

### Step 5: Monitor Deployment

Watch the GitHub Actions logs:

```
✅ Test Stage - Running tests
✅ Build Stage - Building Docker images
✅ Security Scan - Scanning for vulnerabilities
⏳ Deploy Stage - Awaiting approval
✅ Deploy Stage - Infrastructure provisioning
✅ Deploy Stage - Database migrations
✅ Deploy Stage - Application deployment
✅ Deploy Stage - Health checks
```

### Step 6: Verify Deployment

```bash
# Check health endpoint
curl https://api.vaxtrace.gov.ng/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 123.456,
  "database": "connected",
  "redis": "connected"
}

# Check frontend
curl https://vaxtrace.gov.ng

# Check WebSocket connection
wscat -c wss://api.vaxtrace.gov.ng/vaxtrace
```

---

## Post-Deployment Configuration

### Step 1: Configure DNS

Add DNS records for `vaxtrace.gov.ng`:

```
# A Records
@           A    <GBB load balancer IP>
api         A    <GBB load balancer IP>
www         A    <GBB load balancer IP>

# MX Records (for email)
@           MX   10 mail.vaxtrace.gov.ng

# TXT Records
@           TXT  "v=spf1 include:_spf.google.com ~all"
@           TXT  "google-site-verification=<verification-code>"

# CNAME Records
_staging    CNAME staging.vaxtrace.gov.ng
```

### Step 2: Configure SSL/TLS Certificates

#### Option A: Let's Encrypt (Recommended)

```bash
# SSH to server
ssh ubuntu@<server-ip>

# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d vaxtrace.gov.ng -d api.vaxtrace.gov.ng -d www.vaxtrace.gov.ng

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Option B: GBB Provided Certificates

```bash
# Upload certificates to server
scp vaxtrace.crt ubuntu@<server-ip>:/etc/ssl/certs/
scp vaxtrace.key ubuntu@<server-ip>:/etc/ssl/private/
scp gbb-ca.crt ubuntu@<server-ip>:/etc/ssl/certs/

# Update nginx configuration
sudo nano /etc/nginx/conf.d/vaxtrace.conf
```

### Step 3: Initialize Database

```bash
# SSH to PostgreSQL server
ssh ubuntu@<postgres-ip>

# Run migrations
cd ~/vaxtrace
docker-compose exec backend npm run migrate

# Seed initial data
docker-compose exec backend npm run seed

# Verify data
docker-compose exec postgres psql -U vaxtrace_admin -d vaxtrace_nigeria -c "\dt"
```

### Step 4: Configure Monitoring

#### Sentry (Error Tracking)

1. Log in to Sentry: https://sentry.io
2. Create new project: `vaxtrace-production`
3. Copy DSN to GitHub Secrets
4. Verify error tracking:
   ```bash
   # Trigger test error
   curl https://api.vaxtrace.gov.ng/test-error
   ```

#### PostHog (Analytics)

1. Log in to PostHog: https://app.posthog.com
2. Create new project: `VaxTrace Nigeria`
3. Copy key to GitHub Secrets
4. Verify analytics:
   ```bash
   # Check PostHog dashboard for events
   ```

#### Uptime Monitoring

Configure uptime monitors:

```bash
# Using UptimeRobot (or similar)
# Add monitors:
# - https://api.vaxtrace.gov.ng/health
# - https://vaxtrace.gov.ng
# - WebSocket: wss://api.vaxtrace.gov.ng/vaxtrace
```

### Step 5: Configure Backups

```bash
# SSH to server
ssh ubuntu@<server-ip>

# Create backup directory
mkdir -p ~/vaxtrace/backups

# Configure automated backups (cron)
crontab -e

# Add:
0 2 * * * ~/vaxtrace/scripts/backup-db.sh production

# Test backup
~/vaxtrace/scripts/backup-db.sh production

# Verify backup
ls -lh ~/vaxtrace/backups/
```

---

## Monitoring & Health Checks

### Health Check Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/health` | Overall health | `{"status": "ok"}` |
| `/health/db` | Database connectivity | `{"status": "connected"}` |
| `/health/redis` | Redis connectivity | `{"status": "connected"}` |
| `/health/openlmis` | OpenLMIS API | `{"status": "ok"}` |
| `/metrics` | Prometheus metrics | Text format |

### Monitoring Dashboard

Set up a monitoring dashboard (Grafana, DataDog, etc.):

**Key Metrics:**
- Request rate & latency
- Error rate (4xx, 5xx)
- Database connection pool
- Redis memory usage
- WebSocket connections
- Container CPU/memory

**Alerts:**
- Error rate > 5%
- Response time > 2s
- Database connections > 80%
- Redis memory > 90%
- WebSocket disconnections > 10/min

### Log Aggregation

Configure centralized logging:

```bash
# Option A: ELK Stack
# Option B: CloudWatch
# Option C: DataDog Logs

# Example: View logs
ssh ubuntu@<server-ip> "cd ~/vaxtrace && docker-compose logs -f backend"
ssh ubuntu@<server-ip> "cd ~/vaxtrace && docker-compose logs -f frontend"
```

---

## Rollback Procedures

### Automatic Rollback

Production deployments automatically rollback on failure:
- Health check fails
- Database migration fails
- Container startup fails

### Manual Rollback

#### Step 1: Identify Backup

```bash
# List available backups
ssh ubuntu@<server-ip> "ls -lt ~/vaxtrace/backups/*.yml"

# Output:
# backup-20240101-120000.yml
# backup-20240102-140000.yml
# backup-20240103-160000.yml
```

#### Step 2: Execute Rollback

```bash
# Run rollback script
./scripts/rollback.sh production backup-20240103-160000

# Or manually:
ssh ubuntu@<server-ip>
cd ~/vaxtrace
cp backups/backup-20240103-160000.yml docker-compose.yml
docker-compose up -d
```

#### Step 3: Verify Rollback

```bash
# Check health
curl https://api.vaxtrace.gov.ng/health

# Check logs
ssh ubuntu@<server-ip> "cd ~/vaxtrace && docker-compose logs --tail=50"
```

### Emergency Rollback

If critical issues occur:

```bash
# Stop all containers
ssh ubuntu@<server-ip> "cd ~/vaxtrace && docker-compose down"

# Restore from backup
./scripts/restore-db.sh production <backup-file>

# Start previous version
docker-compose -f docker-compose.previous.yml up -d
```

---

## Maintenance & Operations

### Regular Maintenance Tasks

#### Daily
- [ ] Check health endpoints
- [ ] Review error logs
- [ ] Verify backups completed
- [ ] Check disk space

#### Weekly
- [ ] Review security scan results
- [ ] Check for dependency updates
- [ ] Review performance metrics
- [ ] Test rollback procedure

#### Monthly
- [ ] Clean up old Docker images
- [ ] Review and rotate secrets
- [ ] Audit access controls
- [ ] Update documentation

#### Quarterly
- [ ] Disaster recovery test
- [ ] Performance audit
- [ ] Security audit
- [ ] Cost optimization review

### Database Maintenance

```bash
# SSH to PostgreSQL server
ssh ubuntu@<postgres-ip>

# Run vacuum and analyze
docker-compose exec postgres psql -U vaxtrace_admin -d vaxtrace_nigeria -c "VACUUM ANALYZE;"

# Reindex tables
docker-compose exec postgres psql -U vaxtrace_admin -d vaxtrace_nigeria -c "REINDEX DATABASE vaxtrace_nigeria;"

# Check table sizes
docker-compose exec postgres psql -U vaxtrace_admin -d vaxtrace_nigeria -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Log Rotation

Configure log rotation:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/vaxtrace

# Add:
/home/ubuntu/vaxtrace/logs/*.log {
  daily
  rotate 30
  compress
  delaycompress
  missingok
  notifempty
  create 0640 ubuntu ubuntu
}
```

### Security Updates

```bash
# Update system packages
ssh ubuntu@<server-ip>
sudo apt update
sudo apt upgrade -y

# Update Docker images
cd ~/vaxtrace
docker-compose pull
docker-compose up -d

# Clean up old images
docker image prune -a
```

### Disaster Recovery Testing

**Quarterly DR Test:**

1. **Backup Verification**
   ```bash
   # List recent backups
   ls -lh ~/vaxtrace/backups/
   
   # Verify backup integrity
   ./scripts/verify-backup.sh <backup-file>
   ```

2. **Failover Test**
   ```bash
   # Switch to standby database
   # (Documented in runbook)
   ```

3. **Restore Test**
   ```bash
   # Test restore on staging
   ./scripts/restore-db.sh staging <backup-file>
   ```

---

## Troubleshooting

### Common Issues

#### Issue: Deployment Fails

**Symptoms:** GitHub Actions workflow fails

**Solutions:**
1. Check GitHub Actions logs
2. Verify SSH credentials
3. Check GBB Cloud connectivity
4. Review Terraform plan
5. Verify resource quotas

#### Issue: Health Check Fails

**Symptoms:** `/health` endpoint returns error

**Solutions:**
1. Check container status: `docker-compose ps`
2. Check logs: `docker-compose logs backend`
3. Verify database connectivity
4. Check Redis connectivity
5. Verify environment variables

#### Issue: High Memory Usage

**Symptoms:** Containers OOM killed

**Solutions:**
1. Check memory usage: `docker stats`
2. Increase container memory limits
3. Check for memory leaks
4. Restart containers
5. Scale up infrastructure

#### Issue: WebSocket Disconnections

**Symptoms:** Clients frequently disconnected

**Solutions:**
1. Check nginx timeout settings
2. Verify WebSocket configuration
3. Check load balancer settings
4. Review client reconnection logic
5. Monitor server logs

### Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | | devops@vaxtrace.ng |
| Database Admin | | dba@vaxtrace.ng |
| Security Team | | security@vaxtrace.ng |
| GBB Support | | support@galaxybackbone.com |

---

## Appendix

### Useful Commands

```bash
# SSH to production server
ssh ubuntu@<server-ip>

# View container logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Restart containers
docker-compose restart backend
docker-compose restart frontend

# Check container status
docker-compose ps

# Execute command in container
docker-compose exec backend npm run migrate
docker-compose exec postgres psql -U vaxtrace_admin -d vaxtrace_nigeria

# View resource usage
docker stats

# Clean up
docker system prune -a
```

### File Locations

| File | Location |
|------|----------|
| Application | `/home/ubuntu/vaxtrace` |
| Docker Compose | `/home/ubuntu/vaxtrace/docker-compose.yml` |
| Logs | `/home/ubuntu/vaxtrace/logs/` |
| Backups | `/home/ubuntu/vaxtrace/backups/` |
| SSL Certificates | `/etc/ssl/certs/vaxtrace/` |
| Nginx Config | `/etc/nginx/conf.d/vaxtrace.conf` |

### Environment Variables

Production environment variables are stored in:
- GitHub Secrets (for CI/CD)
- Server environment (for runtime)
- Docker Compose configuration

**Never commit secrets to Git!**

---

**Document Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**Maintained By:** VaxTrace DevOps Team  
**Next Review:** 2024-04-15
