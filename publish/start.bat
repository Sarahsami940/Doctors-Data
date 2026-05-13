@echo off
echo ====================================
echo   Doctor Directory Server
echo ====================================
echo.

set PORT=3001
if not "%1"=="" set PORT=%1

echo   URL: http://localhost:%PORT%
echo   API: http://localhost:%PORT%/api
echo.
echo   Press Ctrl+C to stop
echo.

npm run start
