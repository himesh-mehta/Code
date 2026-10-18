import os
import sqlite3
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger("pulse_db")

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "social_pulse.db")

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables for posts, daily metrics, campaigns, and reports."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Stored Posts Table (Deduplicated by URL)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            author TEXT,
            text TEXT NOT NULL,
            url TEXT UNIQUE,
            published_at TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            comments INTEGER DEFAULT 0,
            shares INTEGER DEFAULT 0,
            topic_id TEXT NOT NULL,
            topic_name TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            sentiment_score REAL DEFAULT 0.0,
            is_question INTEGER DEFAULT 0,
            media_url TEXT,
            video_id TEXT,
            place_name TEXT,
            extra_json TEXT,
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_source ON posts(source)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_posts_is_question ON posts(is_question)")

    # 2. Daily Topic Metrics Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_topic_metrics (
            date TEXT NOT NULL,
            topic_id TEXT NOT NULL,
            topic_name TEXT NOT NULL,
            mentions INTEGER DEFAULT 0,
            youtube_count INTEGER DEFAULT 0,
            gdelt_count INTEGER DEFAULT 0,
            bluesky_count INTEGER DEFAULT 0,
            gnews_count INTEGER DEFAULT 0,
            places_count INTEGER DEFAULT 0,
            positive_count INTEGER DEFAULT 0,
            neutral_count INTEGER DEFAULT 0,
            negative_count INTEGER DEFAULT 0,
            engagement INTEGER DEFAULT 0,
            sentiment_score REAL DEFAULT 0.0,
            is_simulated INTEGER DEFAULT 0,
            PRIMARY KEY (date, topic_id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_date ON daily_topic_metrics(date)")

    # 3. Campaigns Table (Draft & Generated)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            opportunity_id TEXT,
            topic TEXT NOT NULL,
            title TEXT NOT NULL,
            target_audience TEXT,
            platform TEXT,
            tone TEXT,
            content_ideas TEXT,
            captions TEXT,
            key_messages TEXT,
            call_to_action TEXT,
            success_metrics TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 4. Reports Table (Generated real CSV/PDF files)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            format TEXT NOT NULL,
            file_path TEXT NOT NULL,
            size_bytes INTEGER DEFAULT 0,
            scope TEXT,
            author TEXT,
            metrics_snapshot TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # 5. App Settings Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    logger.info(f"Initialized SQLite database at {DB_PATH}")

# Call init_db on module import
init_db()

# --- Post Operations ---

def insert_post(post: Dict[str, Any]) -> bool:
    """Inserts a post, ignoring duplicates based on URL. Returns True if inserted."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO posts (
                id, source, author, text, url, published_at, likes, comments, shares,
                topic_id, topic_name, sentiment, sentiment_score, is_question,
                media_url, video_id, place_name, extra_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            post.get("id"),
            post.get("source") or post.get("platform") or "unknown",
            post.get("author") or post.get("author_handle") or "Anonymous",
            post.get("text") or post.get("content") or "",
            post.get("url"),
            post.get("published_at") or post.get("posted_at") or now_iso,
            int(post.get("likes") or 0),
            int(post.get("comments") or 0),
            int(post.get("shares") or 0),
            post.get("topic_id") or "employability",
            post.get("topic_name") or post.get("topic") or "Employability and job readiness",
            post.get("sentiment") or "neutral",
            float(post.get("sentiment_score") or 0.0),
            1 if post.get("is_question") else 0,
            post.get("media_url"),
            post.get("video_id"),
            post.get("place_name"),
            json.dumps(post.get("extra") or {}),
            now_iso
        ))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        logger.error(f"Error inserting post: {e}")
        return False
    finally:
        conn.close()

def insert_posts_batch(posts: List[Dict[str, Any]]) -> int:
    """Inserts a batch of posts, ignoring duplicates. Returns number of newly inserted posts."""
    inserted = 0
    for p in posts:
        if insert_post(p):
            inserted += 1
    return inserted

def get_posts(
    topic_id: Optional[str] = None,
    source: Optional[str] = None,
    sentiment: Optional[str] = None,
    is_question: Optional[bool] = None,
    days: int = 30,
    limit: int = 100,
    offset: int = 0
) -> Tuple[List[Dict[str, Any]], int]:
    """Queries posts matching filters."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if days > 0:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        conditions.append("published_at >= ?")
        params.append(cutoff)

    if topic_id:
        conditions.append("topic_id = ?")
        params.append(topic_id)

    if source:
        conditions.append("source = ?")
        params.append(source)

    if sentiment:
        conditions.append("sentiment = ?")
        params.append(sentiment)

    if is_question is not None:
        conditions.append("is_question = ?")
        params.append(1 if is_question else 0)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Count total
    cursor.execute(f"SELECT COUNT(*) FROM posts {where_clause}", params)
    total = cursor.fetchone()[0]

    # Query page
    cursor.execute(f"""
        SELECT * FROM posts {where_clause}
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
    """, params + [limit, offset])

    rows = cursor.fetchall()
    posts = [dict(r) for r in rows]
    conn.close()
    return posts, total

def get_total_posts_count() -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM posts")
    cnt = cursor.fetchone()[0]
    conn.close()
    return cnt

# --- Daily Metrics Operations ---

def upsert_daily_metrics(metrics: Dict[str, Any]):
    """Upserts a daily aggregation record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO daily_topic_metrics (
            date, topic_id, topic_name, mentions, youtube_count, gdelt_count,
            bluesky_count, gnews_count, places_count, positive_count, neutral_count,
            negative_count, engagement, sentiment_score, is_simulated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date, topic_id) DO UPDATE SET
            mentions = excluded.mentions,
            youtube_count = excluded.youtube_count,
            gdelt_count = excluded.gdelt_count,
            bluesky_count = excluded.bluesky_count,
            gnews_count = excluded.gnews_count,
            places_count = excluded.places_count,
            positive_count = excluded.positive_count,
            neutral_count = excluded.neutral_count,
            negative_count = excluded.negative_count,
            engagement = excluded.engagement,
            sentiment_score = excluded.sentiment_score,
            is_simulated = excluded.is_simulated
    """, (
        metrics["date"],
        metrics["topic_id"],
        metrics["topic_name"],
        metrics.get("mentions", 0),
        metrics.get("youtube_count", 0),
        metrics.get("gdelt_count", 0),
        metrics.get("bluesky_count", 0),
        metrics.get("gnews_count", 0),
        metrics.get("places_count", 0),
        metrics.get("positive_count", 0),
        metrics.get("neutral_count", 0),
        metrics.get("negative_count", 0),
        metrics.get("engagement", 0),
        metrics.get("sentiment_score", 0.0),
        metrics.get("is_simulated", 0)
    ))
    conn.commit()
    conn.close()

def get_daily_metrics_for_topic(topic_id: str, days: int = 90) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM daily_topic_metrics
        WHERE topic_id = ?
        ORDER BY date ASC
    """, (topic_id,))
    rows = cursor.fetchall()
    conn.close()
    result = [dict(r) for r in rows]
    if days and len(result) > days:
        return result[-days:]
    return result

def get_real_days_count_for_topic(topic_id: str) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(DISTINCT date) FROM daily_topic_metrics
        WHERE topic_id = ? AND is_simulated = 0
    """, (topic_id,))
    cnt = cursor.fetchone()[0]
    conn.close()
    return cnt

# --- Campaigns Operations ---

def save_campaign(campaign: Dict[str, Any]) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cid = campaign.get("id") or f"camp_{int(datetime.now().timestamp()*1000)}"

    captions_data = campaign.get("captions") or {}
    if not isinstance(captions_data, dict):
        captions_data = {"raw": captions_data}
    if campaign.get("body_copy"):
        captions_data["primary"] = campaign.get("body_copy")
    if campaign.get("visual_suggestion"):
        captions_data["visual_suggestion"] = campaign.get("visual_suggestion")
    if campaign.get("hashtags"):
        captions_data["hashtags"] = campaign.get("hashtags")

    cursor.execute("""
        INSERT OR REPLACE INTO campaigns (
            id, opportunity_id, topic, title, target_audience, platform, tone,
            content_ideas, captions, key_messages, call_to_action, success_metrics,
            status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        cid,
        campaign.get("opportunity_id"),
        campaign.get("topic") or "Skill Development",
        campaign.get("title") or "Tata STRIVE Campaign",
        campaign.get("target_audience") or "Youth & Job Seekers",
        campaign.get("platform") or "multi-channel",
        campaign.get("tone") or "Inspirational & Practical",
        json.dumps(campaign.get("content_ideas") or []),
        json.dumps(captions_data),
        json.dumps(campaign.get("key_messages") or []),
        campaign.get("call_to_action") or "Enroll in Tata STRIVE programs",
        json.dumps(campaign.get("success_metrics") or []),
        campaign.get("status") or "draft",
        campaign.get("created_at") or now_iso,
        now_iso
    ))
    conn.commit()
    conn.close()
    return cid

def get_saved_campaigns() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM campaigns ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["content_ideas"] = json.loads(d["content_ideas"] or "[]")
        captions_obj = json.loads(d["captions"] or "{}")
        d["captions"] = captions_obj
        if isinstance(captions_obj, dict):
            d["body_copy"] = captions_obj.get("primary", "")
            d["visual_suggestion"] = captions_obj.get("visual_suggestion", "")
            d["hashtags"] = captions_obj.get("hashtags", "")
        else:
            d["body_copy"] = ""
            d["visual_suggestion"] = ""
            d["hashtags"] = ""
        d["key_messages"] = json.loads(d["key_messages"] or "[]")
        d["success_metrics"] = json.loads(d["success_metrics"] or "[]")
        result.append(d)
    return result


def delete_campaign(campaign_id: str) -> bool:

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# --- Reports Operations ---

def save_report(report: Dict[str, Any]) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    rid = report.get("id") or f"rep_{int(datetime.now().timestamp()*1000)}"

    cursor.execute("""
        INSERT OR REPLACE INTO reports (
            id, name, format, file_path, size_bytes, scope, author, metrics_snapshot, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rid,
        report.get("name") or "Social Pulse Intelligence Report",
        report.get("format") or "csv",
        report.get("file_path") or "",
        int(report.get("size_bytes") or 0),
        report.get("scope") or "National",
        report.get("author") or "Social Pulse Intelligence Engine",
        json.dumps(report.get("metrics_snapshot") or {}),
        report.get("created_at") or now_iso
    ))
    conn.commit()
    conn.close()
    return rid

def get_all_reports() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["metrics_snapshot"] = json.loads(d["metrics_snapshot"] or "{}")
        result.append(d)
    return result

def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["metrics_snapshot"] = json.loads(d["metrics_snapshot"] or "{}")
    return d

# --- App Settings Operations ---

def get_setting(key: str, default: Any = None) -> Any:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return default
    try:
        return json.loads(row["value"])
    except Exception:
        return row["value"]

def set_setting(key: str, value: Any) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    val_str = json.dumps(value) if not isinstance(value, str) else value
    cursor.execute("""
        INSERT OR REPLACE INTO app_settings (key, value, updated_at)
        VALUES (?, ?, ?)
    """, (key, val_str, now_iso))
    conn.commit()
    conn.close()

def get_all_settings() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM app_settings")
    rows = cursor.fetchall()
    conn.close()
    res = {}
    for r in rows:
        try:
            res[r["key"]] = json.loads(r["value"])
        except Exception:
            res[r["key"]] = r["value"]
    return res
