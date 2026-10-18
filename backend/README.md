# Social Pulse — Backend Service (FastAPI + Python 3.11)

FastAPI analytics, ML inference, and data persistence backend serving the **Social Pulse Intelligence** platform for Tata STRIVE.

---

## ⚡ Quickstart

### 1. Prerequisites
- **Python**: 3.10+ (Python 3.11 recommended)
- **pip** and `venv`

### 2. Setup Virtual Environment & Install Dependencies
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables
Copy the example environment template:
```bash
cp .env.example .env
```
Key variables:
- `GROQ_API_KEY`: *(Optional)* API key for high-speed Groq LLaMA-3.3-70B campaign synthesis.
- `YOUTUBE_API_KEY`: *(Optional)* API key for live YouTube Data API v3 queries.
- `PORT`: Server port (default: `8000`).

> **Note:** The backend operates fully even without API keys using local RoBERTa inference, SQLite storage, and public RSS / AT Protocol connectors!

### 4. Start the Backend Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```
- **API Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc API Spec**: `http://localhost:8000/redoc`

---

## 🛠️ CLI Utilities & Maintenance Scripts

### 1. Run Data Ingestion & Backfill Job
Fetches latest signals across YouTube, Google News, and Bluesky, maps them into the 13 canonical skilling topics, and updates daily metric observations:
```bash
python -m app.run_backfill
```

### 2. Run Data Authenticity Audit
Validates that every single dashboard page reads genuine numbers from SQLite with zero hardcoded values:
```bash
python -m app.audit_data
```

### 3. Test Local RoBERTa Sentiment Classification
Run standalone sentiment classification on any student feedback or review:
```bash
python sentiment_analyzer.py "The Solar PV technician course at Tata STRIVE helped me secure an interview at Schneider Electric!"
```

---

## 🧠 Core Backend Components

| Component | File | Description |
| :--- | :--- | :--- |
| **Main Application** | `app/main.py` | FastAPI entrypoint mounting all routers, CORS middleware, and scheduler. |
| **SQLite Storage** | `app/db.py` | Thread-safe SQLite persistence layer (`data/social_pulse.db`) with URL deduplication. |
| **RoBERTa Sentiment** | `app/main.py` / `sentiment_analyzer.py` | Local Hugging Face transformer (`cardiffnlp/twitter-roberta-base-sentiment-latest`). |
| **Holt-Winters ETS** | `app/trends/forecasting.py` | Time-series trend forecaster with strict $\ge 21$-day history guardrail. |
| **Opportunity Scorer** | `app/opportunities_service.py` | Deterministic 5-factor scoring engine with dynamic quadrant calculation. |
| **Emerging Skills** | `app/trends/skills_service.py` | Extracts in-demand vocational skills linked to Tata STRIVE courses. |
| **Pulse AI Assistant** | `app/assistant.py` | Multi-turn conversational intelligence agent with screen context injection. |
| **Campaign Studio** | `app/studio_service.py` | Grounded multi-channel campaign generator with anti-hallucination validation. |

---

## 🔒 Security
- All sensitive credentials live in `.env` (gitignored).
- Zero public PII is stored; author handles are sanitized.
