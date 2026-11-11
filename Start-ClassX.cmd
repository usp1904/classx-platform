@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node 20 or newer, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies once...
  call npm install
  if errorlevel 1 ( pause & exit /b 1 )
)
if not exist server\public\index.html (
  echo Building the app once...
  call npm run build
  if errorlevel 1 ( pause & exit /b 1 )
)
node scripts\launch.mjs %*
if errorlevel 1 pause
endlocal
