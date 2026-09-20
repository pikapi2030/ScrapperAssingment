@echo off
setlocal enabledelayedexpansion

title INE Product Price Tracker

echo ================================================================
echo           INE PRODUCT PRICE TRACKER (FULL-STACK)
echo ================================================================
echo.

:: 1. Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js v20+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check if dependencies are installed
if not exist "node_modules\" (
    echo [SETUP] Installing root dependencies...
    call npm install
)

if not exist "backend\node_modules\" (
    echo [SETUP] Installing backend dependencies...
    cd backend
    call npm install
    call npx playwright install chromium
    cd ..
)

if not exist "frontend\node_modules\" (
    echo [SETUP] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ================================================================
echo  SELECT LAUNCH MODE:
echo ================================================================
echo  [1] Start Full Application (Frontend + Backend)
echo  [2] Run Observable Headed Scraper (For Screen Recording)
echo  [3] Run Automated Test Suite (npm test)
echo  [4] Exit
echo ================================================================
echo.

set /p choice="Enter option [1-4] (Default is 1): "
if "%choice%"=="" set choice=1

if "%choice%"=="1" goto start_app
if "%choice%"=="2" goto run_headed
if "%choice%"=="3" goto run_tests
if "%choice%"=="4" goto exit_script

echo Invalid selection. Defaulting to Start Full Application.
goto start_app

:start_app
echo.
echo [STARTING] Launching Backend (http://localhost:5000) and Frontend (http://localhost:5173)...
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5173
call npm run dev
goto exit_script

:run_headed
echo.
set /p pid="Enter Product ID to scrape [Default 533]: "
if "%pid%"=="" set pid=533
echo.
echo [HEADED MODE] Launching Chromium browser with human simulation...
call npm run scrape:headed -- %pid%
echo.
pause
goto exit_script

:run_tests
echo.
echo [TESTS] Running automated verification test suite...
call npm test
echo.
pause
goto exit_script

:exit_script
endlocal
