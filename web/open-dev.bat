@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js is not installed or not on PATH.
  echo Install LTS from https://nodejs.org then run this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo [CardOps] Installing npm packages in web folder ^(first time may take a minute^)...
call npm.cmd install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo.
echo [CardOps] Repo root needs Tailwind for CSS ^(one-time^)...
cd /d "%~dp0.."
if exist package.json (
  call npm.cmd install
)

echo.
echo [CardOps] Starting dev server...
echo Open in your browser:  http://127.0.0.1:3000
echo Leave this window open. Press Ctrl+C to stop the server.
echo.
cd /d "%~dp0"
call npm.cmd run dev
pause
