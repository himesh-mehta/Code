"""
groq_classifier.py — Second-Pass Batch Post Classifier via Groq

Performs second-pass topic classification on posts with unclassified or low-confidence
keyword results.
Uses Groq llama-3.3-70b-versatile (fallback llama-3.1-8b-instant, temperature 0, JSON mode).
Permanently caches results per post id in SQLite, enforces daily quota caps,
and silently falls back to keyword matching if Groq is unavailable.
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
import httpx

from ..db import get_db_connection
from .taxonomy import classify_text_to_topic, TAXONOMY_RULES, TOPIC_CATEGORIES

logger = logging.getLogger("pulse_groq_classifier")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
PRIMARY_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"
DAILY_POST_LIMIT = 1000

def init_classifier_cache_db():
    """Initializes persistent classification cache table in SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS post_classifications (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            is_question INTEGER DEFAULT 0,
            proposed_topic TEXT,
            classified_by TEXT DEFAULT 'groq',
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_classifier_cache_db()

def get_cached_classifications(post_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """Retrieves cached classification results for a list of post IDs."""
    if not post_ids:
        return {}
    conn = get_db_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in post_ids)
    cursor.execute(f"""
        SELECT id, topic_id, sentiment, is_question, proposed_topic
        FROM post_classifications
        WHERE id IN ({placeholders})
    """, post_ids)
    rows = cursor.fetchall()
    conn.close()
    return {
        r["id"]: {
            "topic_id": r["topic_id"],
            "sentiment": r["sentiment"],
            "is_question": bool(r["is_question"]),
            "proposed_topic": r["proposed_topic"]
        }
        for r in rows
    }

def save_classifications_to_cache(results: List[Dict[str, Any]]):
    """Permanently stores classification results in SQLite."""
    if not results:
        return
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    for res in results:
        cursor.execute("""
            INSERT OR REPLACE INTO post_classifications (
                id, topic_id, sentiment, is_question, proposed_topic, classified_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            res["id"],
            res.get("topic_id", "employability"),
            res.get("sentiment", "neutral"),
            1 if res.get("is_question") else 0,
            res.get("proposed_topic"),
            "groq",
            now_iso
        ))
    conn.commit()
    conn.close()

def get_daily_usage_count() -> int:
    """Returns number of posts classified by Groq today."""
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) FROM post_classifications
        WHERE created_at LIKE ? AND classified_by = 'groq'
    """, (f"{today_str}%",))
    cnt = cursor.fetchone()[0]
    conn.close()
    return cnt

async def invoke_groq_classification_batch(
    posts_batch: List[Dict[str, Any]],
    api_key: str
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Sends up to 20 posts to Groq for classification in strict JSON mode.
    Returns (classifications, proposed_new_topics).
    """
    valid_topic_ids = [rule["slug"] for rule in TAXONOMY_RULES.values()] + ["other"]
    
    system_prompt = (
        "You are an expert social listening classifier for Tata STRIVE (vocational skilling and employability).\n"
        "Classify the provided batch of posts into the correct topic_id, sentiment, and whether it's an inquiry/question.\n"
        f"Allowed topic_ids:\n"
        f"{', '.join(valid_topic_ids)}\n\n"
        "Allowed sentiments: positive, neutral, negative\n"
        "is_question: boolean true if learner asks about courses, placements, admissions, or fees; else false.\n\n"
        "If multiple posts marked 'other' describe an emerging skill not covered (e.g. 3D printing, carbon accounting), "
        "you may suggest up to 3 emerging topics under 'proposed_topics', each MUST be backed by at least 5 post IDs from the batch.\n\n"
        "Strict JSON schema:\n"
        "{\n"
        '  "classifications": [\n'
        '    {"id": "string", "topic_id": "string", "sentiment": "positive"|"neutral"|"negative", "is_question": boolean}\n'
        "  ],\n"
        '  "proposed_topics": [\n'
        '    {"name": "string", "post_ids": ["string"]}\n'
        "  ]\n"
        "}"
    )

    items_to_send = [
        {"id": p["id"], "text": p.get("text", "")[:400]}
        for p in posts_batch
    ]
    user_prompt = f"Classify these {len(items_to_send)} posts:\n" + json.dumps(items_to_send, indent=1)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL, "llama-3.1-8b-instant"]

    for model in models_to_try:
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.0,
            "response_format": {"type": "json_object"},
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(GROQ_API_URL, json=body, headers=headers)
                if res.is_success:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        content_str = choices[0].get("message", {}).get("content", "{}")
                        parsed = json.loads(content_str)
                        classifications = parsed.get("classifications", [])
                        
                        # Validate proposed emerging topics: each backed by >= 5 real posts
                        valid_proposed = []
                        for prop in parsed.get("proposed_topics", []):
                            p_ids = prop.get("post_ids", [])
                            if len(p_ids) >= 5 and prop.get("name"):
                                valid_proposed.append({
                                    "name": str(prop["name"]).strip(),
                                    "post_ids": p_ids
                                })

                        return classifications, valid_proposed[:3]
                elif res.status_code == 429:
                    logger.warning(f"Groq rate limit hit with model {model}. Trying fallback...")
                    continue
        except Exception as e:
            logger.warning(f"Groq classification attempt failed with model {model}: {e}")
            continue

    return [], []

async def classify_and_enrich_posts(posts: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Two-pass classification pipeline:
    Pass 1: Deterministic keyword matching.
    Pass 2: Low-confidence posts (< 0.65) checked in SQLite cache or sent to Groq in batches of 20.
    Returns (enriched_posts, emerging_topics).
    """
    api_key = (os.environ.get("GROQ_API_KEY") or "").strip()
    enriched_posts: List[Dict[str, Any]] = []
    low_confidence_posts: List[Dict[str, Any]] = []

    # First Pass: Keyword matching
    for p in posts:
        text = p.get("text", "")
        topic_name, topic_slug, confidence = classify_text_to_topic(text)
        p["topic_name"] = topic_name
        p["topic_id"] = topic_slug
        p["classification_confidence"] = confidence

        if confidence < 0.65:
            low_confidence_posts.append(p)
        enriched_posts.append(p)

    if not low_confidence_posts:
        return enriched_posts, []

    # Second Pass: Check permanent cache
    cached_map = get_cached_classifications([p["id"] for p in low_confidence_posts])
    posts_needing_groq: List[Dict[str, Any]] = []

    for p in low_confidence_posts:
        if p["id"] in cached_map:
            cached_data = cached_map[p["id"]]
            p["topic_id"] = cached_data["topic_id"]
            p["sentiment"] = cached_data["sentiment"]
            p["is_question"] = cached_data["is_question"]
        else:
            posts_needing_groq.append(p)

    # Check daily limit and Groq API key
    all_emerging_topics: List[Dict[str, Any]] = []
    if api_key and posts_needing_groq:
        current_daily_usage = get_daily_usage_count()
        if current_daily_usage < DAILY_POST_LIMIT:
            # Batch in groups of 20
            batch_size = 20
            for i in range(0, min(len(posts_needing_groq), 60), batch_size):
                batch = posts_needing_groq[i:i + batch_size]
                classifications, proposed = await invoke_groq_classification_batch(batch, api_key)
                
                # Apply Groq results
                cache_items_to_save = []
                cls_map = {c["id"]: c for c in classifications if "id" in c}
                for p in batch:
                    if p["id"] in cls_map:
                        c_info = cls_map[p["id"]]
                        tid = c_info.get("topic_id", p["topic_id"])
                        if tid != "other" and tid in [r["slug"] for r in TAXONOMY_RULES.values()]:
                            p["topic_id"] = tid
                        p["sentiment"] = c_info.get("sentiment", p.get("sentiment", "neutral"))
                        p["is_question"] = bool(c_info.get("is_question", p.get("is_question", False)))
                        cache_items_to_save.append({
                            "id": p["id"],
                            "topic_id": p["topic_id"],
                            "sentiment": p["sentiment"],
                            "is_question": p["is_question"],
                            "proposed_topic": None,
                        })

                if cache_items_to_save:
                    save_classifications_to_cache(cache_items_to_save)
                
                if proposed:
                    all_emerging_topics.extend(proposed)
        else:
            logger.info("Daily Groq classification limit reached (%d posts). Using keyword matching.", DAILY_POST_LIMIT)

    return enriched_posts, all_emerging_topics
