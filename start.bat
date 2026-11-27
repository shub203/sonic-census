@echo off
title Sonic Census - Launch Platform
echo ========================================================
echo          SONIC CENSUS — INITIALIZING SYSTEM
echo ========================================================
echo.
echo [1/2] Starting Python FastAPI Backend on http://127.0.0.1:8000 ...
start "Sonic Census - Backend" cmd /k "cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [2/2] Starting React Vite Frontend on http://127.0.0.1:5173 ...
start "Sonic Census - Frontend" cmd /k "cd frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo ========================================================
echo Platform is active!
echo Frontend: http://127.0.0.1:5173
echo Backend API: http://127.0.0.1:8000
echo OpenAPI Docs: http://127.0.0.1:8000/docs
echo ========================================================
pause
