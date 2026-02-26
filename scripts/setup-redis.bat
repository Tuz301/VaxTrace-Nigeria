@echo off
REM ============================================
REM VaxTrace Nigeria - Redis Setup Script (Windows)
REM ============================================
REM This script checks and sets up Redis for VaxTrace
REM ============================================

echo.
echo ============================================
echo VaxTrace Nigeria - Redis Setup
echo ============================================
echo.

REM Check if Redis is running
where redis-cli >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [1/3] Redis is not installed or not in PATH
    echo.
    echo Please install Redis:
    echo.
    echo Option 1: Using Chocolatey (Recommended)
    echo   choco install redis-64
    echo.
    echo Option 2: Download Memurai (Redis for Windows)
    echo   https://www.memurai.com/get-memurai
    echo.
    echo Option 3: Use Docker
    echo   docker run -d -p 6379:6379 redis:alpine
    echo.
    pause
    exit /b 1
)

echo [2/3] Redis found!
echo.

REM Test Redis connection
redis-cli ping >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Redis is not running. Starting Redis server...
    echo.
    start /B redis-server
    timeout /t 3 /nobreak >nul
)

REM Verify Redis is running
redis-cli ping >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Redis failed to start
    echo.
    echo Please start Redis manually:
    echo   redis-server
    echo.
    pause
    exit /b 1
)

echo [3/3] Redis is running!
echo.

echo ============================================
echo Redis Setup Complete!
echo ============================================
echo.
echo Redis is running on: localhost:6379
echo.
echo Test connection:
echo   redis-cli ping
echo.
echo You can now start the backend server:
echo   cd backend
echo   npm run start:dev
echo.
pause
