"""
RoBERTa AI Sentiment Analyzer for Social Pulse (Tata STRIVE)
Model: cardiffnlp/twitter-roberta-base-sentiment-latest
"""

import sys
from transformers import pipeline

print("Loading cardiffnlp/twitter-roberta-base-sentiment-latest model...")
sentiment_model = pipeline(
    "text-classification",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest"
)

def analyze_sentiment(text: str):
    """
    Analyzes sentiment of student feedback, video comments, or public discussions.
    Returns:
        { "sentiment": "positive" | "neutral" | "negative", "confidence": float }
    """
    if not text or not text.strip():
        return {"sentiment": "neutral", "confidence": 0.5}

    result = sentiment_model(text)[0]
    return {
        "sentiment": result["label"].lower(),
        "confidence": round(result["score"], 3)
    }

if __name__ == "__main__":
    sample_text = (
        " ".join(sys.argv[1:])
        if len(sys.argv) > 1
        else "The training was useful and helped me find a job!"
    )
    print(f"\n[Tata STRIVE Social Pulse] Testing Sentiment Analysis:")
    print(f"Input: \"{sample_text}\"")
    result = analyze_sentiment(sample_text)
    print(f"Result: {result}\n")
