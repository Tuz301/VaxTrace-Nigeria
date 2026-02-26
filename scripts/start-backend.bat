@echo off
REM ============================================
REM VaxTrace Nigeria - Backend Server Startup Script
REM ============================================

echo.
echo ============================================
echo VaxTrace Nigeria - Starting Backend Server
echo ============================================
echo.

REM Check if PostgreSQL is running
echo [1/5] Checking PostgreSQL...
psql -U vaxtrace_admin -d vaxtrace_nigeria -c "SELECT 1;" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PostgreSQL is not running or database not accessible
    echo.
    echo Please ensure:
    echo   1. PostgreSQL is running
    echo   2. Database 'vaxtrace_nigeria' exists
    echo   3. User 'vaxtrace_admin' has access
    echo.
    echo Run setup-database.bat first if you haven't already.
    pause
    exit /b 1
)
echo PostgreSQL is running!
echo.

REM Check if Redis is running
echo [2/5] Checking Redis...
redis-cli ping >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Redis is not running
    echo.
    echo Please ensure Redis is running on localhost:6379
    echo.
    echo Run setup-redis.bat first if you haven't already.
    pause
    exit /b 1
)
echo Redis is running!
echo.

REM Check if node_modules exists
echo [3/5] Checking dependencies...
if not exist "backend\node_modules\" (
    echo Installing backend dependencies...
    cd backend
    npm install
    cd ..
)
echo Dependencies installed!
echo.

REM Check if .env file exists
echo [4/5] Checking environment configuration...
if not exist ".env" (
    echo ERROR: .env file not found!
    echo.
    echo Please copy .env.example to .env and configure it:
    echo   copy .env.example .env
    pause
    exit /b 1
)
echo Environment configured!
echo.

REM Start backend server
echo [5/5] Starting backend server...
echo.
echo ============================================
echo Backend Server Starting...
echo ============================================
echo.
echo Backend will be available at: http://localhost:8000
echo API Documentation: http://localhost:800.com/api/v1/openlmis/test-connection
echo.
echo Press Ctrl+C to stop the server
echo.

cd backend
npm run start:dev
