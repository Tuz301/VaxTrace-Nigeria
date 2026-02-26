# VaxTrace Nigeria - Backend Startup Guide

This guide explains how to start the backend server with OpenLMIS integration to display real facility data.

## Prerequisites

### 1. PostgreSQL with PostGIS
- Database: `vaxtrace_nigeria`
- User: `vagrant_admin`
- Port: 5432

**Verify:**
```cmd
psql -U vaxtrace_admin -d vaxtrace_navaria -c "SELECT COUNT(*) FROM locations;"
```

### 2. Redis
- Port: 6379

**Verify:**
```cmd
redis-cli ping
# Should return: PONG
```

### 3. Node.js Dependencies
```cmd
cd backend
npm install
```

## Quick Start (Automated)

### Step 1: Setup Database (First Time Only)
```cmd
cd scripts
setup-database.bat
```

### Step 2: Setup Redis (First Time Only)
```cmd
cd scripts
setup-redis.bat
```

### Step 3: Start Backend Server
```cmd
cd scripts
start-backend.bat
```

Or manually:
```cmd
cd backend
npm run start:dev
```

## What the Backend Server Does

When started, the backend server:

1. **Connects to PostgreSQL** - Runs migrations, seeds data
2. **Connects to Redis** - Enables caching for performance
3. **Attempts OpenLMIS Connection** - Tries to fetch OAuth2 token
4. **Starts API Server** - Listens on `http://localhost:8000`

## OpenLMIS Integration

### Current Configuration

The backend will attempt to connect to OpenLMIS using credentials from [`.env`](.env:46):

```env
OPENLMIS_BASE_URL=http://nglmis.nphcda.gov.ng
OPENLMIS_CLIENT_ID=user-client
OPENLMIS_CLIENT_SECRET=changeme  # ⚠️ Placeholder
OPENLMIS_USERNAME=cheezaram
OPENLMIS_PASSWORD=tkU6wBao8Q
```

### Expected Behavior

**With Invalid Credentials (Current):**
```
[OpenLMIS] Attempting token fetch...
[OpenLMIS] ✗ Failed to fetch OpenLMIS access token
[OpenLMIS] Falling back to mock mode
```

**With Valid Credentials:**
```
[OpenLMIS] ✓ Successfully fetched OpenLMIS access token
[OpenLMIS] ✓ Initial token fetch successful
[OpenLMIS] Service initialized in REAL mode
```

## API Endpoints

Once running, the backend provides:

| Endpoint | Description |
|----------|-------------|
| `/api/v1/openlmis/health` | Check OpenLMIS connection health |
| `/api/v1/openlmis/status` | Detailed connection status |
| `/api/v1/openlmis/test-connection` | Connection diagnostics |
| `/api/v1/openlmis/facilities` | Get facilities from OpenLMIS |

## Testing the Connection

### Check OpenLMIS Status
```cmd
curl http://localhost:8000/api/v1/openlmis/status
```

**Response (Mock Mode):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "mode": "MOCK",
    "openlmisUrl": "http://nglmis.nphcda.gov.ng"
  }
}
```

**Response (Real Mode):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "mode": "REAL",
    "token": {
      "hasToken": true,
      "timeUntilExpiryMinutes": 55
    }
  }
}
```

## Facility Data Flow

### With Mock Mode (Current)
```
User taps facility → Frontend API → Mock data → Display
```

### With Real Mode (With Valid Credentials)
```
User taps facility → Frontend API → Backend → OpenLMIS API → Real data → Display
```

## Switching to Real OpenLMIS Data

### Step 1: Get Valid Credentials

1. Log in to OpenLMIS: http://nglmis.nphcda.gov.ng
2. Navigate to **Administration** → **OAuth2 Clients**
3. Create or find your service account
4. Copy the **Client ID** and **Client Secret**

### Step 2: Update .env File

```env
OPENLMIS_CLIENT_SECRET=your-actual-client-secret-from-openlmis
```

### Step 3: Restart Backend

```cmd
# Press Ctrl+C to stop, then:
cd backend
npm run start:dev
```

### Step 4: Verify Real Mode

```cmd
curl http://localhost:8000/api/v1/openlmis/status
```

Look for `"mode": "REAL"` in the response.

## Troubleshooting

### Backend Won't Start

**PostgreSQL connection error:**
```cmd
# Check PostgreSQL is running
sc query postgresql-x64-16

# Start if needed
sc start postgresql-x64-16
```

**Redis connection error:**
```cmd
# Check Redis is running
redis-cli ping

# Start if needed
redis-server
```

### OpenLMIS Connection Fails

**Check credentials:**
- Verify `OPENLMIS_CLIENT_SECRET` is not `changeme`
- Verify `OPENLMIS_USERNAME` and `OPENLMIS_PASSWORD` are correct
- Verify `OPENLMIS_BASE_URL` is accessible

**Test connection manually:**
```cmd
curl http://nglmis.nphcda.gov.ng/api/oauth/token
```

### Port Already in Use

```cmd
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <pid> /F
```

## Logs

Backend logs will show:
- Database connection status
- Redis connection status
- OpenLMIS authentication attempts
- API requests/responses
- Any errors that occur

## Next Steps

Once backend is running:
1. Open http://localhost:3000 (frontend)
2. Tap on any facility
3. View real facility data from OpenLMIS

The facility detail page will now display accurate location information matching the LGA you clicked on.
