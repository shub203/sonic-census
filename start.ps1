Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         SONIC CENSUS — INITIALIZING SYSTEM            " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting Python FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

Write-Host "[2/2] Starting React Vite Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --host 127.0.0.1 --port 5173"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " Platform successfully started!" -ForegroundColor Green
Write-Host " Frontend:    http://127.0.0.1:5173" -ForegroundColor White
Write-Host " Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host " OpenAPI Doc: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
