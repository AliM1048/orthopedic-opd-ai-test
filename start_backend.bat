@echo off
echo ============================================
echo   Whisper STT App - Starting Backend
echo ============================================
cd /d "%~dp0backend"
echo Installing/verifying Python dependencies...
pip install -r requirements.txt --quiet
echo.
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop
echo ============================================
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
