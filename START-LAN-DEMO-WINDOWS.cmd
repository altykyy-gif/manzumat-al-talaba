@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 or newer, then run this file again.
  pause
  exit /b 1
)
set "AHMAD_HOST=0.0.0.0"
set "AHMAD_PORT=8080"
echo Open http://127.0.0.1:8080/ on this PC.
echo From another device on the same local network, use this PC's IPv4 address:
ipconfig | findstr /i "IPv4"
echo Use http://IPv4:8080/ with the displayed local address.
node --no-warnings server.mjs --demo
pause
