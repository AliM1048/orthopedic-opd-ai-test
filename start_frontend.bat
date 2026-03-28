@echo off
echo ============================================
echo   Whisper STT App - Starting Frontend
echo ============================================
cd /d "%~dp0frontend"
echo Starting React dev server on http://localhost:5173
echo Press Ctrl+C to stop
echo ============================================
npm run dev
