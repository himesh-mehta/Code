@echo off
title Social Pulse - RoBERTa AI Sentiment Service
echo ==========================================================
echo  Social Pulse - RoBERTa AI Sentiment Service
echo  Model: cardiffnlp/twitter-roberta-base-sentiment-latest
echo ==========================================================
cd /d "%~dp0"

if not exist venv\Scripts\python.exe (
    echo Setting up Python 3.10 virtual environment...
    py -3.10 -m venv venv
    venv\Scripts\pip.exe install -r requirements.txt
)

echo Starting FastAPI on http://localhost:8000...
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
