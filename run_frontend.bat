@echo off
rem Patient and family hub site. http://localhost:5173
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing packages...
  call npm install
)
echo Patient and hub site on http://localhost:5173
call npm run dev
