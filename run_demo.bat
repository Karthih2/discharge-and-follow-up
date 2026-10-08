@echo off
rem One command. One address. Everything runs on http://localhost:8000
rem   run_demo.bat           start the demo (builds the app the first time)
rem   run_demo.bat rebuild   rebuild the app first, then start
cd /d "%~dp0"
if not exist backend\.venv (
  echo Creating Python environment...
  python -m venv backend\.venv
)
call backend\.venv\Scripts\python.exe -m pip install -q -r backend\requirements.txt
if not exist backend\.env copy backend\.env.example backend\.env >nul
if not exist frontend\node_modules (
  echo Installing app packages, one time only...
  pushd frontend
  call npm install
  popd
)
if "%1"=="rebuild" (
  pushd frontend
  call npm run build
  popd
)
if not exist frontend\dist\index.html (
  echo Building the app, one time only...
  pushd frontend
  call npm run build
  popd
)
set DEMO=1
echo.
echo   CareBridge demo: http://localhost:8000/demo
echo   Close this window to stop.
echo.
start "" http://localhost:8000/demo
cd backend
..\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
