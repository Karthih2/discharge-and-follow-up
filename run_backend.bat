@echo off
cd /d "%~dp0backend"
if not exist .venv (
  echo Creating virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install -q -r requirements.txt
if not exist .env copy .env.example .env >nul
echo Starting CareBridge API on http://localhost:8000
python -m uvicorn app.main:app --port 8000 --reload
