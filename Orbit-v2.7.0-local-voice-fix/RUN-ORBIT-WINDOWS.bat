@echo off
setlocal
cd /d "%~dp0"
title Orbit v2.0.0 Setup and Launch

echo ==========================================
echo   ORBIT v2.0.0 - Setup and Launch
 echo ==========================================
echo.
if not exist package.json (
  echo ERROR: package.json is missing. Extract the entire ZIP first.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or is not on PATH.
  echo Install Node.js 20.19+ or 22.12+, then reopen this window.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available on PATH.
  pause
  exit /b 1
)
echo Project folder: %CD%
echo Node version:
node --version
echo.
if not exist node_modules (
  echo Installing project dependencies. This may take a few minutes...
  call npm install
  if errorlevel 1 goto failed
)
echo.
echo Building Orbit v2.0.0...
call npm run build
if errorlevel 1 goto failed
echo.
echo Launching Orbit v2.0.0. Keep this window open while using Orbit.
call npm run desktop
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo Orbit did not start successfully. Copy the error above for diagnosis.
pause
exit /b 1
