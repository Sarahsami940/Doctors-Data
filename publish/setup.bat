@echo off
echo ====================================
echo   Doctor Directory - Setup
echo ====================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Dependencies already included
echo.
echo Seeding database from Excel files...
call npm run seed
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to seed database
    pause
    exit /b 1
)
echo [OK] Database seeded successfully

echo.
echo ====================================
echo   Setup Complete!
echo ====================================
echo.
echo Run start.bat to start the server
pause
