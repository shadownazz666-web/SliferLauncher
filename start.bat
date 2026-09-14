@echo off
cd /d "%~dp0"

rem Rust/cargo is often missing from cmd PATH even when installed.
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Install Node.js, then run start.bat again.
  pause
  exit /b 1
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo cargo was not found at %%USERPROFILE%%\.cargo\bin
  echo Install Rust from https://rustup.rs then run start.bat again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Slifer ^(tauri dev^)...
call npm run tauri -- dev
if errorlevel 1 (
  echo Launch failed.
  pause
  exit /b 1
)
