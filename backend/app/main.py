from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(
    title="Social Pulse AI Sentiment Service",
    description="FastAPI service serving cardiffnlp/twitter-roberta-base-sentiment-latest for Tata STRIVE Social Pulse",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"
_sentiment_pipeline = None

def get_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        from transformers import pipeline
        print(f"Loading transformer pipeline: {MODEL_NAME}...")
        _sentiment_pipeline = pipeline("text-classification", model=MODEL_NAME)
        print("Model loaded successfully.")
    return _sentiment_pipeline

class AnalyzeRequest(BaseModel):
    text: str

class BatchAnalyzeRequest(BaseModel):
    texts: List[str]

class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    model: str = MODEL_NAME

class BatchSentimentResponse(BaseModel):
    results: List[SentimentResponse]

@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "Social Pulse AI RoBERTa Sentiment Service",
        "model": MODEL_NAME,
        "target": "Tata STRIVE Employability & Skilling Intelligence",
    }

@app.post("/api/sentiment/analyze", response_model=SentimentResponse)
def analyze(req: AnalyzeRequest):
    if not req.text or not req.text.strip():
        return SentimentResponse(sentiment="neutral", confidence=0.5)

    try:
        nlp = get_pipeline()
        res = nlp(req.text[:512])[0]
        sentiment_label = res["label"].lower()
        confidence = round(float(res["score"]), 3)
        return SentimentResponse(sentiment=sentiment_label, confidence=confidence)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/api/sentiment/batch", response_model=BatchSentimentResponse)
def analyze_batch(req: BatchAnalyzeRequest):
    if not req.texts:
        return BatchSentimentResponse(results=[])

    try:
        nlp = get_pipeline()
        clean_texts = [t[:512] for t in req.texts]
        raw_results = nlp(clean_texts)
        results = [
            SentimentResponse(
                sentiment=item["label"].lower(),
                confidence=round(float(item["score"]), 3),
            )
            for item in raw_results
        ]
        return BatchSentimentResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch inference error: {str(e)}")

# Pulse AI Assistant Endpoints
from .assistant import ChatRequest, ChatResponse, process_chat, get_engine_config

@app.get("/api/assistant/status")
def assistant_status():
    cfg = get_engine_config()
    return {
        "status": "online",
        "configured": cfg["configured"],
        "provider": cfg["provider"],
        "model": cfg["model"],
        "name": "Pulse AI",
        "role": "Social Intelligence Analyst & Tata STRIVE Dashboard Guide",
    }

@app.post("/api/assistant/chat", response_model=ChatResponse)
async def assistant_chat(req: ChatRequest):
    try:
        return await process_chat(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant processing error: {str(e)}")

# Mount Trend Intelligence & ML Forecasting Router
from .trends.routes import router as trends_router
from .trends.scheduler import scheduler

app.include_router(trends_router)

@app.on_event("startup")
def on_startup():
    try:
        scheduler.start()
    except Exception as e:
        print(f"Scheduler start notice: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Social Pulse Sentiment, Trends & Assistant Service on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
