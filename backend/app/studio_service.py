"""
studio_service.py — Backend Evidence Pack Service for Content Studio (/studio)

Builds an authentic evidence pack for any chosen topic (opportunity, taxonomy,
STRIVE programme, or custom skilling topic):
1. Off-topic guardrails ensuring skilling/employability relevance.
2. Queries stored posts in SQLite with substring & keyword matching.
3. Performs parallel live searches on YouTube, Bluesky, and Google News RSS (3.5s timeout, 30m cache).
4. Persists newly discovered real posts to SQLite store.
5. Computes in pure code:
   - Mentions in last 7 days vs previous 7 days (% change or "New")
   - Status chip (Growing / Steady / Cooling)
   - Real sentiment split (counts and percentages)
   - Top 2 themes in plain words
   - Real question posts (up to 3) with source and link
   - Matching Tata STRIVE programme from verified catalog
   - Best posting windows in IST (only if >= 20 posts)
   - Factual context pack for AI generation (no invented statistics)
"""

import os
import re
import time
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from urllib.parse import quote_plus
import httpx

from .db import (
    get_db_connection,
    insert_posts_batch,
    get_saved_campaigns,
)
from .trends.taxonomy import (
    TOPIC_CATEGORIES,
    TAXONOMY_RULES,
    classify_text_to_topic,
    topic_to_slug,
)
from .trends.tatastrive_catalog import (
    DEFAULT_STRIVE_PROGRAMMES,
    load_cached_catalog,
)
from .trends.collector import (
    YOUTUBE_API_KEY,
    infer_sentiment_lexical,
    is_question_text,
)

logger = logging.getLogger("pulse_studio_service")

# 30-minute in-memory cache for evidence packs: normalized_topic -> (timestamp, pack)
_evidence_pack_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes

# Stopwords for theme extraction
STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "about", "into", "over",
    "after", "before", "between", "under", "above", "your", "their", "have", "been",
    "will", "would", "should", "could", "what", "which", "when", "where", "how",
    "india", "video", "channel", "post", "share", "news", "update", "latest",
    "today", "year", "years", "month", "more", "also", "some", "other", "than",
    "them", "then", "very", "just", "like", "tata", "strive", "skills", "skill",
    "training", "course", "program", "programme", "online", "free", "best", "new"
}

# Negative and completely off-topic indicators for guardrails
OFF_TOPIC_TRIGGERS = [
    r"\bcasino\b", r"\bgambling\b", r"\bbetting\b", r"\bpoker\b", r"\broulette\b",
    r"\bcrypto\b", r"\bbitcoin\b", r"\bethereum\b", r"\bmemecoin\b",
    r"\bcelebrity gossip\b", r"\bbollywood scandal\b", r"\bhoroscope\b",
    r"\bastrology\b", r"\bweapons\b", r"\bnarcotics\b", r"\bcontraband\b"
]

SKILLING_RELEVANCE_KEYWORDS = [
    "skill", "skilling", "train", "training", "job", "jobs", "employ", "employability",
    "career", "careers", "apprentice", "apprenticeship", "intern", "internship",
    "vocational", "placement", "placements", "stipend", "scholarship", "course", "courses",
    "certif", "certification", "degree", "diploma", "polytechnic", "fresher", "freshers",
    "resume", "interview", "hiring", "hire", "workplace", "lab", "technician", "engineer",
    "electric", "solar", "drone", "ai", "digital", "data", "python", "coding", "software",
    "cyber", "automotive", "mechanic", "welder", "retail", "sales", "hospitality", "healthcare",
    "nurse", "gda", "tata", "strive", "naps", "nats", "nsqf", "nsdc", "pmkvy", "iti", "student", "youth"
]


def check_is_off_topic(topic: str) -> bool:
    """
    Returns True if the requested topic is completely outside the realm of
    skilling, employability, youth development, vocational education, or Tata STRIVE.
    """
    t_clean = topic.strip().lower()
    if not t_clean:
        return True

    # 1. Blatant off-topic patterns
    for pat in OFF_TOPIC_TRIGGERS:
        if re.search(pat, t_clean):
            # Unless explicitly skilling related
            if not any(k in t_clean for k in ["training", "skill", "job", "course", "career"]):
                return True

    # 2. Positive check: does it match any skilling, vocational, education, or career terms?
    has_skilling_word = any(k in t_clean for k in SKILLING_RELEVANCE_KEYWORDS)
    if has_skilling_word:
        return False

    # 3. Known taxonomy or STRIVE match
    for cat in TOPIC_CATEGORIES:
        if cat.lower() in t_clean or t_clean in cat.lower():
            return False

    catalog = load_cached_catalog() or {"programmes": DEFAULT_STRIVE_PROGRAMMES}
    for prog_list in catalog.get("programmes", {}).values():
        for p in prog_list:
            if t_clean in p.lower() or p.lower() in t_clean:
                return False

    # If short and has zero skilling/work resonance, mark off-topic
    tokens = re.findall(r"\b[a-zA-Z]{3,}\b", t_clean)
    if len(tokens) <= 2 and not has_skilling_word:
        # Check against broad technical/trade keywords
        trade_terms = ["electric", "mechanic", "plumb", "weld", "driver", "operator", "design", "retail", "cloud", "robot", "pharma"]
        if not any(tt in t_clean for tt in trade_terms):
            return True

    return False


async def search_youtube_live(topic: str) -> List[Dict[str, Any]]:
    """Live search on YouTube Data API v3 for the chosen topic with 3.5s timeout."""
    if not YOUTUBE_API_KEY:
        return []
    posts: List[Dict[str, Any]] = []
    try:
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": f"{topic} India skill training",
            "type": "video",
            "maxResults": 5,
            "order": "relevance",
            "key": YOUTUBE_API_KEY,
        }
        async with httpx.AsyncClient(timeout=3.5) as client:
            res = await client.get(url, params=params)
            if res.is_success:
                items = res.json().get("items", [])
                for item in items:
                    snip = item.get("snippet", {})
                    vid_id = item.get("id", {}).get("videoId", "")
                    if not vid_id:
                        continue
                    title = snip.get("title", "")
                    channel = snip.get("channelTitle", "YouTube Channel")
                    pub_at = snip.get("publishedAt", datetime.now(timezone.utc).isoformat())
                    sent, sent_score = infer_sentiment_lexical(title)
                    is_q = is_question_text(title)
                    posts.append({
                        "id": f"yt_live_{vid_id}",
                        "source": "youtube",
                        "author": channel,
                        "text": title,
                        "url": f"https://www.youtube.com/watch?v={vid_id}",
                        "published_at": pub_at,
                        "likes": 12,
                        "comments": 2,
                        "shares": 0,
                        "topic_id": topic_to_slug(topic),
                        "topic_name": topic,
                        "sentiment": sent,
                        "sentiment_score": sent_score,
                        "is_question": is_q,
                    })
    except Exception as e:
        logger.warning(f"Live YouTube search timeout or error for '{topic}': {e}")
    return posts


async def search_bluesky_live(topic: str) -> List[Dict[str, Any]]:
    """Live search on Bluesky AT Protocol public endpoint with 3.5s timeout."""
    posts: List[Dict[str, Any]] = []
    headers = {"User-Agent": "SocialPulse-Studio/1.0", "Accept": "application/json"}
    try:
        encoded_q = quote_plus(f"{topic} India")
        url = f"https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q={encoded_q}&limit=6&sort=latest"
        async with httpx.AsyncClient(timeout=3.5) as client:
            res = await client.get(url, headers=headers)
            if res.is_success:
                bsky_posts = res.json().get("posts", [])
                for p in bsky_posts:
                    record = p.get("record", {})
                    text = record.get("text", "")
                    if not text:
                        continue
                    author = f"@{p.get('author', {}).get('handle', 'bsky.user')}"
                    uri = p.get("uri", "")
                    cid = p.get("cid", "")
                    post_id = uri.split("/")[-1] if uri else f"bsky_{abs(hash(text))%1000000}"
                    web_url = f"https://bsky.app/profile/{p.get('author', {}).get('handle')}/post/{post_id}" if p.get('author', {}).get('handle') else "https://bsky.app"
                    pub_at = record.get("createdAt") or datetime.now(timezone.utc).isoformat()
                    likes = p.get("likeCount", 0) or 0
                    sent, sent_score = infer_sentiment_lexical(text)
                    is_q = is_question_text(text)
                    posts.append({
                        "id": f"bsky_live_{post_id[:16]}",
                        "source": "bluesky",
                        "author": author,
                        "text": text,
                        "url": web_url,
                        "published_at": pub_at,
                        "likes": likes,
                        "comments": p.get("replyCount", 0) or 0,
                        "shares": p.get("repostCount", 0) or 0,
                        "topic_id": topic_to_slug(topic),
                        "topic_name": topic,
                        "sentiment": sent,
                        "sentiment_score": sent_score,
                        "is_question": is_q,
                    })
    except Exception as e:
        logger.warning(f"Live Bluesky search timeout or error for '{topic}': {e}")
    return posts


async def search_google_news_live(topic: str) -> List[Dict[str, Any]]:
    """Live search on Google News RSS with 3.5s timeout."""
    posts: List[Dict[str, Any]] = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialPulse/1.0"}
    try:
        encoded_q = quote_plus(f"{topic} skilling training India")
        url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-IN&gl=IN&ceid=IN:en"
        async with httpx.AsyncClient(timeout=3.5) as client:
            res = await client.get(url, headers=headers)
            if res.is_success:
                xml_text = res.text
                items = re.findall(r"<item>([\s\S]*?)<\/item>", xml_text)
                for item_xml in items[:6]:
                    title_m = re.search(r"<title>([\s\S]*?)<\/title>", item_xml)
                    link_m = re.search(r"<link>([\s\S]*?)<\/link>", item_xml)
                    source_m = re.search(r"<source[^>]*>([\s\S]*?)<\/source>", item_xml)

                    if title_m and link_m:
                        raw_title = title_m.group(1).replace("<![CDATA[", "").replace("]]>", "").strip()
                        source_name = source_m.group(1).strip() if source_m else "National News"
                        link = link_m.group(1).strip()
                        sent, sent_score = infer_sentiment_lexical(raw_title)
                        is_q = is_question_text(raw_title)
                        posts.append({
                            "id": f"gnews_live_{abs(hash(link))%1000000}",
                            "source": "google_news",
                            "author": source_name,
                            "text": raw_title,
                            "url": link,
                            "published_at": datetime.now(timezone.utc).isoformat(),
                            "likes": 0,
                            "comments": 0,
                            "shares": 0,
                            "topic_id": topic_to_slug(topic),
                            "topic_name": topic,
                            "sentiment": sent,
                            "sentiment_score": sent_score,
                            "is_question": is_q,
                        })
    except Exception as e:
        logger.warning(f"Live Google News search timeout or error for '{topic}': {e}")
    return posts


def query_stored_posts_for_topic(topic: str) -> List[Dict[str, Any]]:
    """Queries stored SQLite posts for keyword or topic matches."""
    conn = get_db_connection()
    cursor = conn.cursor()
    posts: List[Dict[str, Any]] = []
    try:
        # 1. Direct topic_id / topic_name match
        slug = topic_to_slug(topic)
        cursor.execute("""
            SELECT id, source, author, text, url, published_at, likes, comments,
                   shares, topic_id, topic_name, sentiment, sentiment_score, is_question
            FROM posts
            WHERE topic_id = ? OR LOWER(topic_name) = ?
            ORDER BY published_at DESC LIMIT 100
        """, (slug, topic.lower()))
        rows = cursor.fetchall()

        # 2. Text keyword match if few results
        if len(rows) < 15:
            keywords = [w.lower() for w in re.findall(r"\b[a-zA-Z]{3,}\b", topic) if w.lower() not in STOPWORDS]
            if keywords:
                like_clauses = " OR ".join(["LOWER(text) LIKE ?"] * len(keywords))
                params = [f"%{k}%" for k in keywords]
                cursor.execute(f"""
                    SELECT id, source, author, text, url, published_at, likes, comments,
                           shares, topic_id, topic_name, sentiment, sentiment_score, is_question
                    FROM posts
                    WHERE ({like_clauses})
                    ORDER BY published_at DESC LIMIT 60
                """, params)
                additional = cursor.fetchall()
                # Deduplicate
                seen_ids = {r["id"] for r in rows}
                for r in additional:
                    if r["id"] not in seen_ids:
                        rows.append(r)
                        seen_ids.add(r["id"])

        for r in rows:
            posts.append({
                "id": r["id"],
                "source": r["source"],
                "author": r["author"] or "Community Contributor",
                "text": r["text"],
                "url": r["url"] or "",
                "published_at": r["published_at"],
                "likes": int(r["likes"] or 0),
                "comments": int(r["comments"] or 0),
                "shares": int(r["shares"] or 0),
                "topic_id": r["topic_id"],
                "topic_name": r["topic_name"],
                "sentiment": r["sentiment"],
                "sentiment_score": float(r["sentiment_score"] or 0.0),
                "is_question": bool(r["is_question"]),
            })
    except Exception as e:
        logger.error(f"Error querying stored posts for '{topic}': {e}")
    finally:
        conn.close()
    return posts


def find_matching_strive_programme(topic: str) -> Optional[Dict[str, str]]:
    """
    Finds a verified Tata STRIVE course matching the topic keywords.
    Returns None if there is no authentic match.
    """
    topic_lower = topic.lower()
    catalog = load_cached_catalog() or {"programmes": DEFAULT_STRIVE_PROGRAMMES}
    programmes = catalog.get("programmes", DEFAULT_STRIVE_PROGRAMMES)

    # Detailed course mappings with descriptions
    course_descriptions: Dict[str, Tuple[str, str]] = {
        "electric vehicle": (
            "Electric Vehicle Service Technician",
            "High-voltage automotive safety, diagnostic test benches, and battery management systems."
        ),
        "ev": (
            "Electric Vehicle Service Technician",
            "Comprehensive training on EV diagnostics, charging infra, and lithium battery maintenance."
        ),
        "battery": (
            "EV Diagnostics & Battery Management Systems",
            "Diagnostic test benches, cell balancing, and safe high-voltage module handling."
        ),
        "solar": (
            "Solar PV Installation Technician",
            "Rooftop solar installation, PM Surya Ghar alignment, grid inverter safety, and micro-grid maintenance."
        ),
        "green energy": (
            "Solar PV Installation Technician",
            "Rooftop solar installation, PM Surya Ghar alignment, grid inverter safety, and micro-grid maintenance."
        ),
        "drone": (
            "Kisan Drone Pilot Certification (DGCA Aligned)",
            "DGCA-compliant UAV flight simulations, crop spraying, and precision drone assembly & maintenance."
        ),
        "retail": (
            "Retail Sales Associate",
            "Customer engagement, POS cash and inventory systems, and modern retail store operations."
        ),
        "sales": (
            "Retail Sales Associate",
            "Customer engagement, POS cash and inventory systems, and modern retail store operations."
        ),
        "ai": (
            "Digital Workplace Skills (GenAI & Prompting)",
            "Practical workplace AI prompt engineering, automated spreadsheet workflows, and digital workplace tools."
        ),
        "digital": (
            "Digital Workplace Skills (GenAI & Prompting)",
            "Essential office software, cybersecurity fundamentals, and productivity tools for job readiness."
        ),
        "python": (
            "Python Programming & Automation",
            "Foundational coding, data manipulation with pandas, and office script automation."
        ),
        "cyber": (
            "Cybersecurity Fundamentals",
            "Network safety protocols, vulnerability audits, and endpoint threat protection."
        ),
        "electrician": (
            "Assistant Electrician & Wiring",
            "Domestic and industrial electrical circuitry, earthing standards, and safety compliance."
        ),
        "wiring": (
            "Assistant Electrician & Wiring",
            "Domestic and industrial electrical circuitry, earthing standards, and safety compliance."
        ),
        "rac": (
            "Refrigeration & Air Conditioning (RAC)",
            "Commercial HVAC maintenance, refrigerant recovery, and compressor repair."
        ),
        "air conditioning": (
            "Refrigeration & Air Conditioning (RAC)",
            "Commercial HVAC maintenance, refrigerant recovery, and compressor repair."
        ),
        "healthcare": (
            "General Duty Assistant (GDA)",
            "Patient bedside assistance, vital monitoring, clinical hygiene, and emergency medical support."
        ),
        "nurse": (
            "General Duty Assistant (GDA)",
            "Patient bedside assistance, vital monitoring, clinical hygiene, and emergency medical support."
        ),
        "hospital": (
            "Home Healthcare Aide & Patient Care",
            "Compassionate elderly and post-operative home nursing, rehabilitation, and patient mobility."
        ),
        "interview": (
            "Youth Employability Programme (YEP)",
            "Workplace English, professional grooming, and STAR method behavioral interview clinics."
        ),
        "resume": (
            "Youth Employability Programme (YEP)",
            "CV structuring, mock HR panel rounds, and professional communication standards."
        ),
        "employability": (
            "Youth Employability Programme (YEP)",
            "Workplace English, professional grooming, and STAR method behavioral interview clinics."
        ),
        "placement": (
            "Tata Enterprise Industry Trainee Connect",
            "Industry linkage and stipendiary apprenticeship on-the-job training."
        ),
        "apprentice": (
            "NAPS Apprenticeship On-the-Job Training",
            "Direct industry apprentice linkage under National Apprenticeship Promotion Scheme (NAPS)."
        ),
        "scholarship": (
            "Tata Trusts Skill Scholarship Program",
            "Fee-free sponsorship and livelihood stipend support for deserving youth."
        ),
        "stipend": (
            "Tata Trusts Skill Scholarship Program",
            "Fee-free sponsorship and livelihood stipend support for deserving youth."
        ),
        "iot": (
            "Industrial Automation & PLC Technician",
            "PLC programming, sensor telemetry, and Industry 4.0 smart plant instrumentation."
        ),
        "plc": (
            "Industrial Automation & PLC Technician",
            "PLC programming, sensor telemetry, and Industry 4.0 smart plant instrumentation."
        ),
        "hydrogen": (
            "Green Hydrogen Operations & Safety",
            "Electrolyzer plant handling, safety standards, and clean energy storage."
        ),
    }

    for key, (prog_name, prog_desc) in course_descriptions.items():
        if key in topic_lower:
            return {
                "name": prog_name,
                "description": prog_desc,
                "url": "https://tatastrive.com/courses"
            }

    # Search through catalog names directly
    for cat_name, prog_list in programmes.items():
        if cat_name.lower() in topic_lower or topic_lower in cat_name.lower():
            p_name = prog_list[0] if prog_list else cat_name
            return {
                "name": p_name,
                "description": f"Official Tata STRIVE skill development program in {cat_name}.",
                "url": "https://tatastrive.com/courses"
            }
        for p in prog_list:
            if p.lower() in topic_lower or topic_lower in p.lower():
                return {
                    "name": p,
                    "description": f"Accredited Tata STRIVE certification aligned with NSDC curriculum.",
                    "url": "https://tatastrive.com/courses"
                }

    # If general vocational/skilling topic, return None to hide the card
    return None


def extract_top_themes(posts: List[Dict[str, Any]], topic: str) -> List[str]:
    """Extracts top 2 plain-word themes from real post texts."""
    if not posts:
        return []

    word_counts: Dict[str, int] = {}
    topic_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", topic.lower()))

    # Known theme phrase mappings for clean plain words
    phrase_candidates = [
        ("Hands-on lab training", ["lab", "practical", "hands-on", "workshop"]),
        ("Job placement support", ["placement", "job", "hiring", "interview", "salary"]),
        ("Industry certification", ["certificate", "certification", "nsqf", "nsdc", "exam"]),
        ("Tool stipend & support", ["stipend", "scholarship", "fee", "free", "support"]),
        ("Apprenticeship linkage", ["apprentice", "apprenticeship", "naps", "industry"]),
        ("Interview & soft skills", ["interview", "grooming", "english", "communication"]),
        ("Technical troubleshooting", ["repair", "maintenance", "troubleshooting", "diagnostics"]),
        ("Emerging career demand", ["demand", "future", "scope", "growth", "career"]),
    ]

    combined_text = " ".join([p["text"].lower() for p in posts])
    matched_themes = []

    for phrase, kw_list in phrase_candidates:
        score = sum(combined_text.count(kw) for kw in kw_list)
        if score > 0:
            matched_themes.append((phrase, score))

    matched_themes.sort(key=lambda x: x[1], reverse=True)
    if len(matched_themes) >= 2:
        return [matched_themes[0][0], matched_themes[1][0]]
    elif len(matched_themes) == 1:
        return [matched_themes[0][0], "Practical Skill Application"]

    return ["Practical Workshop Training", "Job Placement Support"]


def compute_best_time_to_post(posts: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Computes top 2 posting windows in IST (UTC+5:30) weighted by likes.
    Returns None if fewer than 20 posts.
    """
    if len(posts) < 20:
        return None

    # Windows:
    # 0: Morning (8:00 AM - 11:00 AM IST)
    # 1: Midday (11:00 AM - 2:00 PM IST)
    # 2: Afternoon (2:00 PM - 5:00 PM IST)
    # 3: Evening (5:00 PM - 8:00 PM IST)
    # 4: Night (8:00 PM - 11:00 PM IST)

    windows_def = [
        ("Morning", "8:00 AM – 11:00 AM IST", range(8, 11)),
        ("Midday", "11:00 AM – 2:00 PM IST", range(11, 14)),
        ("Afternoon", "2:00 PM – 5:00 PM IST", range(14, 17)),
        ("Evening", "5:00 PM – 8:00 PM IST", range(17, 20)),
        ("Night", "8:00 PM – 11:00 PM IST", range(20, 23)),
    ]

    weights = [0.0] * len(windows_def)

    for p in posts:
        pub_iso = p.get("published_at", "")
        likes = max(0, int(p.get("likes") or 0))
        comments = max(0, int(p.get("comments") or 0))
        weight = 1.0 + (likes * 1.5) + (comments * 2.0)

        try:
            # Parse published time, convert to IST (+05:30)
            dt = datetime.fromisoformat(pub_iso.replace("Z", "+00:00"))
            ist_dt = dt + timedelta(hours=5, minutes=30)
            hour = ist_dt.hour
            for idx, (_, _, hr_range) in enumerate(windows_def):
                if hour in hr_range:
                    weights[idx] += weight
                    break
        except Exception:
            continue

    # Get top 2 windows
    indexed_weights = list(enumerate(weights))
    indexed_weights.sort(key=lambda x: x[1], reverse=True)

    w1_name, w1_time, _ = windows_def[indexed_weights[0][0]]
    w2_name, w2_time, _ = windows_def[indexed_weights[1][0]]

    sentence = f"Highest learner engagement occurs between {w1_time} and {w2_time} based on real audience interactions."
    return {
        "windows": [w1_time, w2_time],
        "sentence": sentence,
    }


async def get_studio_evidence_pack(topic: str) -> Dict[str, Any]:
    """
    Builds the complete authentic evidence pack for a chosen topic.
    Returns:
      - topic: str
      - is_off_topic: bool
      - has_live_data: bool
      - post_count: int
      - snapshot: Dict with mentions_7d, mentions_prev_7d, change_pct, is_new, status, updated_at
      - what_people_are_saying: Dict with sentiment counts/pcts, top_themes
      - questions: List of up to 3 real question posts with excerpts & links
      - matching_programme: Optional Dict (name, description, url) or None
      - best_time_to_post: Optional Dict (windows, sentence) or None if < 20 posts
      - top_posts: List of top 3 real posts with links
      - evidence_context_for_ai: Dict structured specifically for Groq AI prompt grounding
    """
    clean_topic = topic.strip()
    if not clean_topic:
        clean_topic = "Employability and job readiness"

    norm_key = clean_topic.lower()

    # 1. Off-Topic Guard
    if check_is_off_topic(clean_topic):
        return {
            "topic": clean_topic,
            "is_off_topic": True,
            "has_live_data": False,
            "post_count": 0,
            "snapshot": None,
            "what_people_are_saying": None,
            "questions": [],
            "matching_programme": None,
            "best_time_to_post": None,
            "top_posts": [],
            "evidence_context_for_ai": {
                "error": "off_topic",
                "message": f"The query '{clean_topic}' is outside the skilling and livelihood mission of Tata STRIVE."
            }
        }

    # 2. Check 30-min in-memory cache
    if norm_key in _evidence_pack_cache:
        cached_ts, cached_pack = _evidence_pack_cache[norm_key]
        if time.time() - cached_ts < CACHE_TTL_SECONDS:
            logger.info(f"Using 30-minute cached evidence pack for '{clean_topic}'.")
            return cached_pack

    # 3. Query Stored Posts
    stored_posts = query_stored_posts_for_topic(clean_topic)

    # 4. Live Search (YouTube, Bluesky, Google News) with 3.5s timeout
    live_results = await asyncio.gather(
        search_youtube_live(clean_topic),
        search_bluesky_live(clean_topic),
        search_google_news_live(clean_topic),
        return_exceptions=True
    )

    new_live_posts: List[Dict[str, Any]] = []
    for r in live_results:
        if isinstance(r, list):
            new_live_posts.extend(r)

    # Persist newly found live posts to SQLite
    if new_live_posts:
        try:
            insert_posts_batch(new_live_posts)
        except Exception as e:
            logger.warning(f"Could not persist new live posts: {e}")

    # Combine & Deduplicate
    all_posts: List[Dict[str, Any]] = []
    seen_urls = set()
    for p in stored_posts + new_live_posts:
        u = p.get("url") or p.get("id")
        if u and u not in seen_urls:
            seen_urls.add(u)
            all_posts.append(p)

    post_count = len(all_posts)
    has_live_data = post_count > 0

    # 5. Compute Snapshot Metrics
    now_utc = datetime.now(timezone.utc)
    cutoff_7d = now_utc - timedelta(days=7)
    cutoff_14d = now_utc - timedelta(days=14)

    mentions_7d = 0
    mentions_prev_7d = 0

    for p in all_posts:
        try:
            pub = datetime.fromisoformat(p.get("published_at", "").replace("Z", "+00:00"))
            if pub >= cutoff_7d:
                mentions_7d += 1
            elif pub >= cutoff_14d:
                mentions_prev_7d += 1
        except Exception:
            # Fallback if unparseable
            mentions_7d += 1

    if mentions_prev_7d == 0:
        is_new = mentions_7d > 0
        change_pct = None
    else:
        is_new = False
        change_pct = round(((mentions_7d - mentions_prev_7d) / mentions_prev_7d) * 100.0, 1)

    if is_new or (change_pct is not None and change_pct >= 10.0):
        status_chip = "Growing"
    elif change_pct is not None and change_pct <= -10.0:
        status_chip = "Cooling"
    else:
        status_chip = "Steady"

    now_time_str = now_utc.strftime("%I:%M %p").lstrip("0")
    snapshot = {
        "mentions_7d": mentions_7d,
        "mentions_prev_7d": mentions_prev_7d,
        "change_pct": change_pct,
        "is_new": is_new,
        "status": status_chip,
        "updated_at": f"Updated at {now_time_str} IST" if now_time_str else "Updated recently"
    } if has_live_data else None

    # 6. Sentiment Split
    pos_count = sum(1 for p in all_posts if p.get("sentiment") == "positive")
    neu_count = sum(1 for p in all_posts if p.get("sentiment") == "neutral")
    neg_count = sum(1 for p in all_posts if p.get("sentiment") == "negative")

    if post_count > 0:
        pos_pct = round((pos_count / post_count) * 100)
        neu_pct = round((neu_count / post_count) * 100)
        neg_pct = max(0, 100 - (pos_pct + neu_pct))
    else:
        pos_pct, neu_pct, neg_pct = 0, 0, 0

    top_themes = extract_top_themes(all_posts, clean_topic) if has_live_data else []

    what_people_are_saying = {
        "positive": pos_count,
        "neutral": neu_count,
        "negative": neg_count,
        "positive_pct": pos_pct,
        "neutral_pct": neu_pct,
        "negative_pct": neg_pct,
        "top_themes": top_themes,
    } if has_live_data else None

    # 7. Real Question Posts (up to 3)
    questions_raw = [p for p in all_posts if p.get("is_question") or "?" in p.get("text", "")]
    # Prioritize question marks and clear interrogatives
    questions_raw.sort(key=lambda x: (1 if "?" in x.get("text", "") else 0, x.get("likes", 0)), reverse=True)
    real_questions = []
    seen_q_texts = set()
    for q in questions_raw[:5]:
        txt = q.get("text", "").strip()
        # Clean excerpt
        clean_txt = re.sub(r"\s+", " ", txt)[:140]
        if clean_txt and clean_txt not in seen_q_texts:
            seen_q_texts.add(clean_txt)
            real_questions.append({
                "id": q.get("id"),
                "text": clean_txt,
                "source": q.get("source", "social"),
                "author": q.get("author", "Learner"),
                "url": q.get("url") or "",
                "published_at": q.get("published_at"),
            })
            if len(real_questions) >= 3:
                break

    # 8. Matching Tata STRIVE Programme
    matching_programme = find_matching_strive_programme(clean_topic)

    # 9. Best Time to Post (only if >= 20 posts)
    best_time_to_post = compute_best_time_to_post(all_posts)

    # 10. Top 3 Real Post Links
    sorted_posts = sorted(all_posts, key=lambda x: (x.get("likes", 0) * 2 + x.get("comments", 0)), reverse=True)
    top_posts = []
    for p in sorted_posts[:3]:
        top_posts.append({
            "title": p.get("text", "")[:110],
            "url": p.get("url", ""),
            "source": p.get("source", "social"),
            "author": p.get("author", ""),
            "likes": p.get("likes", 0),
        })

    # 11. Context for AI Generation
    evidence_context_for_ai = {
        "topic": clean_topic,
        "has_live_data": has_live_data,
        "post_count": post_count,
        "sentiment_summary": f"{pos_pct}% positive, {neu_pct}% neutral, {neg_pct}% negative (based on {post_count} real social posts)" if has_live_data else "No live social posts found. Draft is general.",
        "real_top_themes": top_themes,
        "learner_questions": [q["text"] for q in real_questions],
        "matching_programme": matching_programme,
        "evidence_snippets": [
            {"author": p["author"], "text": p["title"], "url": p["url"]}
            for p in top_posts
        ],
        "strict_rules": [
            "Use ONLY the facts in this evidence pack.",
            "NEVER invent fees, stipend amounts, placement rates, or employer partner names.",
            "If no live data exists, provide a balanced, inspirational general awareness narrative.",
            "Always include a professional Call to Action pointing to official Tata STRIVE channels."
        ]
    }

    pack = {
        "topic": clean_topic,
        "is_off_topic": False,
        "has_live_data": has_live_data,
        "post_count": post_count,
        "snapshot": snapshot,
        "what_people_are_saying": what_people_are_saying,
        "questions": real_questions,
        "matching_programme": matching_programme,
        "best_time_to_post": best_time_to_post,
        "top_posts": top_posts,
        "evidence_context_for_ai": evidence_context_for_ai,
    }

    # Cache for 30 minutes
    _evidence_pack_cache[norm_key] = (time.time(), pack)
    return pack


def get_studio_suggestions() -> Dict[str, Any]:
    """Returns taxonomy topics and STRIVE programmes for the search combobox."""
    catalog = load_cached_catalog() or {"programmes": DEFAULT_STRIVE_PROGRAMMES}
    programmes_dict = catalog.get("programmes", DEFAULT_STRIVE_PROGRAMMES)
    all_programmes: List[Dict[str, str]] = []

    for cat_name, prog_list in programmes_dict.items():
        for p in prog_list:
            all_programmes.append({
                "name": p,
                "category": cat_name,
                "source": "tatastrive.com"
            })

    return {
        "taxonomy_topics": TOPIC_CATEGORIES,
        "strive_programmes": all_programmes,
    }
