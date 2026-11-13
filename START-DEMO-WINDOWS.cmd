@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 or newer, then run this file again.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8080/ in Chrome or Edge.
node --no-warnings server.mjs --demo
pause
