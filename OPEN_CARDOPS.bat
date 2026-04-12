@echo off
:: Double-click this file from File Explorer to install deps, start the app, and open the browser.
setlocal
set "WEB=%~dp0web"
cd /d "%WEB%"

where node >nul 2>&1
if errorlevel 1 (
  start https://nodejs.org/
  echo Node.js was not found. Install it from the page that just opened, then run OPEN_CARDOPS.bat again.
  pause
  exit /b 1
)

echo Installing packages if needed...
call npm.cmd install
if errorlevel 1 ( echo npm install failed in web folder & pause & exit /b 1 )

cd /d "%~dp0"
if exist package.json (
  call npm.cmd install
)

echo Starting server in a new window...
cd /d "%~dp0"
start "CardOps dev server" cmd /k "cd /d ""%~dp0"" && echo Local app: http://127.0.0.1:3000/dashboard && npm.cmd run dev"

echo Waiting for server to compile...
timeout /t 12 /nobreak >nul

echo Opening browser...
start http://127.0.0.1:3000/dashboard

echo.
echo If the page is blank, wait a few seconds and refresh, or open: http://127.0.0.1:3000/dashboard
echo Close the "CardOps dev server" window to stop the site.
echo.
pause
