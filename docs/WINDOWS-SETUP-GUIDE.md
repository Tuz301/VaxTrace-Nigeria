# VaxTrace Nigeria - Windows Setup Guide

This guide helps you set up VaxTrace Nigeria on Windows for development.

## Prerequisites

### 1. PostgreSQL with PostGIS

**Download & Install:**
1. Go to: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. Download PostgreSQL 16 (or latest version)
3. **Important:** During installation, select "PostGIS" in the component selection
4. Set password for `postgres` user (remember it!)
5. Install to default location: `C:\Program Files\PostgreSQL\16`

**Add to PATH:**
1. Add `C:\Program Files\PostgreSQL\16\bin` to your system PATH
2. Restart Command Prompt/PowerShell

**Verify Installation:**
```cmd
psql --version
```

### 2. Redis

**Option 1: Using Chocolatey (Recommended)**
```cmd
choco install redis-64
```

**Option 2: Download Memurai (Redis for Windows)**
1. Go to: https://www.memurai.com/get-memurai
2. Download and install Memurai
3. Add to PATH if needed

**Option 3: Use Docker**
```cmd
docker run -d -p 6379:6379 --name vaxtrace-redis redis:alpine
```

**Verify Installation:**
```cmd
redis-cli --version
```

### 3. Node.js

1. Download from: https://nodejs.org/
2. Install LTS version
3. Verify: `node --version` and `npm --version`

## Quick Setup (Automated)

### Step 1: Setup Database
Run the automated setup script:
```cmd
cd scripts
setup-database.bat
```

This will:
- Create database `vaxtrace_nigeria`
- Create user `vaxtrace_admin`
- Run all migrations
- Run all seeds

### Step 2: Setup Redis
Run the Redis setup script:
```cmd
cd scripts
setup-redis.bat
```

This will:
- Check Redis installation
- Start Redis server
- Verify connection

### Step 3: Install Dependencies
```cmd
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ..\frontend
npm install
```

### Step 4: Start Servers

**Terminal 1 - Backend:**
```cmd
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```cmd
cd frontend
npm run dev
```

## Manual Setup (If Scripts Fail)

### Create Database Manually
```cmd
# Connect to PostgreSQL
psql -U postgres

# Create user
CREATE USER vaxtrace_admin WITH PASSWORD 'your_secure_password_here_change_this';

# Create database
CREATE DATABASE vaxtrace_nigeria OWNER vaxtrace_admin;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE vaxtrace_nigeria TO vaxtrace_admin;

# Exit
\q
```

### Run Migrations Manually
```cmd
psql -U vaxtrace_admin -d vaxtrace_nigeria -f backend\database\migrations\001_initial_schema.sql
```

### Run Seeds Manually
```cmd
psql -U vaxtrace_admin -d vaxtrace_nigeria -f backend\database\seeds\001_seed_locations.sql
psql -U vaxtrace_admin -d vaxtrace_nigeria -f backend\database\seeds\002_seed_vaccines.sql
```

### Start Redis Manually
```cmd
redis-server
```

## Using Docker Compose (Easiest)

If you have Docker installed, you can start everything with:

```cmd
docker-compose up -d postgres redis
```

This will:
- Start PostgreSQL with PostGIS
- Start Redis
- Both services will be available on localhost

## Environment Configuration

Your `.env` file should have:
```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=vaxtrace_admin
POSTGRES_PASSWORD=your_secure_password_here_change_this
POSTGRES_DB=vaxtrace_nigeria

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Development Mode (Optional)
OPENLMIS_DEV_MODE=true
```

## Troubleshooting

### PostgreSQL Issues

**"psql: command not found"**
- Add PostgreSQL bin directory to PATH
- Restart Command Prompt

**"connection refused"**
- Check PostgreSQL service is running:
  ```cmd
  sc query postgresql-x64-16
  ```
- Start if needed:
  ```cmd
  sc start postgresql-x64-16
  ```

**"FATAL: password authentication failed"**
- Check password in `.env` matches what you set during installation

### Redis Issues

**"redis-cli: command not found"**
- Install Redis or add to PATH
- Or use Docker option

**"Connection refused"**
- Start Redis server:
  ```cmd
  redis-server
  ```
- Or check if running on different port

### Port Conflicts

**PostgreSQL port 5432 in use:**
- Change port in `.env`:
  ```env
  POSTGRES_PORT=5433
  ```

**Redis port 6379 in use:**
- Change port in `.env`:
  ```env
  REDIS_PORT=6380
  ```

## Verify Setup

### Test Database
```cmd
psql -U vaxtrace_admin -d vaxtrace_nigeria -c "SELECT COUNT(*) FROM locations;"
```

### Test Redis
```cmd
redis-cli ping
# Should return: PONG
```

### Test Backend
```cmd
curl http://localhost:8000/api/v1/openlmis/health
```

### Test Frontend
Open browser: http://localhost:3000

## Next Steps

Once everything is running:
1. Open http://localhost:3000
2. Login with mock credentials (if in dev mode)
3. Navigate to dashboard
4. View facilities by state/LGA

## Support

For issues, check:
- Backend logs: Terminal running backend
- Frontend logs: Browser console (F12)
- Database logs: PostgreSQL logs in `C:\Program Files\PostgreSQL\16\data\log`
