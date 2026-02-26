@echo off
REM ============================================
REM VaxTrace Nigeria - Database Setup Script (Windows)
REM ============================================
REM This script sets up PostgreSQL with PostGIS and Redis
REM ============================================

echo.
echo ============================================
echo VaxTrace Nigeria - Database Setup
echo ============================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PostgreSQL is not installed or not in PATH
    echo.
    echo Please install PostgreSQL with PostGIS:
    echo 1. Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
    echo 2. During installation, make sure to include PostGIS extension
    echo 3. Add PostgreSQL bin directory to your PATH
    echo.
    pause
    exit /b 1
)

echo [1/6] PostgreSQL found!
echo.

REM Database configuration
set DB_NAME=vaxtrace_nigeria
set DB_USER=vaxtrace_admin
set DB_PORT=5432

echo [2/6] Creating database and user...
echo.

REM Create database and user
psql -U postgres -p %DB_PORT% -c "DROP DATABASE IF EXISTS %DB_NAME%;" 2>nul
psql -U postgres -p %DB_PORT% -c "DROP USER IF EXISTS %DB_USER%;" 2>nul
psql -U postgres -p %DB_PORT% -c "CREATE USER %DB_USER% WITH PASSWORD 'your_secure_password_here_change_this';"
psql -U postgres -p %DB_PORT% -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;"
psql -U postgres -p %DB_PORT% -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

echo [3/6] Database created successfully!
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0
set MIGRATION_DIR=%SCRIPT_DIR%..\backend\database\migrations
set SEED_DIR=%SCRIPT_DIR%..\backend\database\seeds

echo [4/6] Running migrations...
echo.

REM Run migrations
psql -U %DB_USER% -d %DB_NAME% -p %DB_PORT% -f "%MIGRATION_DIR%\001_initial_schema.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to run migrations
    pause
    exit /b 1
)

echo [5/6] Migrations completed successfully!
echo.

REM Run seeds
echo Running location seeds...
psql -U %DB_USER% -d %DB_NAME% -p %DB_PORT% -f "%SEED_DIR%\001_seed_locations.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to run location seeds
    pause
    exit /b 1
)

echo Running vaccine seeds...
psql -U %DB_USER% -d %DB_NAME% -p %DB_PORT% -f "%SEED_DIR%\002_seed_vaccines.sql"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to run vaccine seeds
    pause
    exit /b 1
)

echo [6/6] Seeds completed successfully!
echo.

echo ============================================
echo Database Setup Complete!
echo ============================================
echo.
echo Database: %DB_NAME%
echo User: %DB_USER%
echo Port: %DB_PORT%
echo.
echo You can now start the backend server:
echo   cd backend
echo   npm run start:dev
echo.
pause
