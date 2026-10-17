Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Social Pulse - RoBERTa AI Sentiment Service" -ForegroundColor Cyan
Write-Host " Model: cardiffnlp/twitter-roberta-base-sentiment-latest" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$pythonExe = Join-Path $scriptDir "venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    Write-Host "Virtual environment not found. Setting up venv..." -ForegroundColor Yellow
    py -3.10 -m venv venv
    & .\venv\Scripts\pip.exe install -r requirements.txt
}

Write-Host "Starting FastAPI service on http://localhost:8000..." -ForegroundColor Green
& .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
