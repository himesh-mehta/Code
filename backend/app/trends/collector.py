import os
import re
import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple, Optional
import httpx

from .taxonomy import classify_text_to_topic, TAXONOMY_RULES, TOPIC_CATEGORIES
from ..db import insert_posts_batch, upsert_daily_metrics, get_db_connection

logger = logging.getLogger("pulse_collector")

# In-memory search cache (TTL: 30 minutes to protect YouTube quota)
SEARCH_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes

YOUTUBE_API_KEY = (
    os.environ.get("YOUTUBE_API_KEY")
    or os.environ.get("NEXT_PUBLIC_YOUTUBE_API_KEY")
    or "AIzaSyBrEppqTLIpnffQKaapzWOih9dzn7zdRRc"
)

# Search queries for comprehensive domain coverage across all 13 topics
SEARCH_QUERIES = [
    ("Tata STRIVE skill development", "vocational-training"),
    ("electric vehicle technician training India", "ev-diagnostics"),
    ("solar PV rooftop installation training India", "solar-pv"),
    ("practical AI prompt engineering skills freshers", "ai-and-digital-skills"),
    ("campus placement interview preparation resume India", "employability"),
    ("apprenticeship NAPS NATS stipend scheme India", "internships-and-placements"),
    ("mudra loan self employment entrepreneurship India", "entrepreneurship"),
    ("career counseling tier 2 youth India", "youth-education"),
    ("industry 4 0 PLC automation technician India", "industrial-iot-plc"),
    ("green hydrogen technician mission India", "green-hydrogen"),
    ("general duty assistant healthcare nursing training India", "tele-health-gda"),
    ("kisan drone pilot training DGCA certification India", "drone-technology"),
]

def infer_sentiment_lexical(text: str) -> Tuple[str, float]:
    """Lightweight rule-based sentiment classifier with domain polarity."""
    lower = text.lower()
    pos_words = [
        "placement", "hired", "success", "helpful", "good", "great", "excellent",
        "empower", "growth", "opportunity", "boost", "certified", "free course",
        "best", "love", "awesome", "useful", "congrats", "pass"
    ]
    neg_words = [
        "reject", "struggle", "difficult", "bad", "scam", "unemployed", "fail",
        "delay", "problem", "crisis", "worst", "shortage", "fake", "fraud",
        "no job", "confused", "waste", "cheat"
    ]

    pos = sum(1 for w in pos_words if w in lower)
    neg = sum(1 for w in neg_words if w in lower)

    if pos > neg:
        return ("positive", min(0.95, 0.70 + pos * 0.08))
    elif neg > pos:
        return ("negative", min(0.95, 0.70 + neg * 0.08))
    return ("neutral", 0.60)

def is_question_text(text: str) -> bool:
    """Detects whether text contains genuine learner questions or inquiries."""
    lower = text.lower().strip()
    return (
        "?" in text
        or lower.startswith("how ")
        or lower.startswith("what ")
        or lower.startswith("when ")
        or lower.startswith("where ")
        or lower.startswith("why ")
        or lower.startswith("is ")
        or lower.startswith("can ")
        or "how to" in lower
        or "fees kitni" in lower
        or "placement milega" in lower
        or "admission kab" in lower
    )

async def collect_youtube_posts(max_per_query: int = 5) -> List[Dict[str, Any]]:
    """Collects real YouTube videos and statistics, respecting API quota and caching."""
    if not YOUTUBE_API_KEY:
        logger.warning("YOUTUBE_API_KEY not configured.")
        return []

    cache_key = "yt_batch_all"
    now_ts = datetime.now(timezone.utc).timestamp()
    if cache_key in SEARCH_CACHE and now_ts - SEARCH_CACHE[cache_key]["timestamp"] < CACHE_TTL_SECONDS:
        logger.info("Using cached YouTube search batch.")
        return SEARCH_CACHE[cache_key]["data"]

    collected_posts: List[Dict[str, Any]] = []
    headers = {"User-Agent": "SocialPulse-Collector/1.0"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for q, default_topic in SEARCH_QUERIES[:6]:  # Query top 6 queries per cycle
                search_url = (
                    f"https://www.googleapis.com/youtube/v3/search"
                    f"?part=snippet&type=video&maxResults={max_per_query}"
                    f"&q={httpx.URL(q)}&key={YOUTUBE_API_KEY}&order=relevance"
                )
                try:
                    res = await client.get(search_url, headers=headers)
                    if res.status_code == 403:
                        logger.warning("YouTube quota exceeded.")
                        break
                    if not res.is_success:
                        continue

                    items = res.json().get("items", [])
                    video_ids = [it["id"]["videoId"] for it in items if "id" in it and "videoId" in it["id"]]

                    stats_map = {}
                    if video_ids:
                        stats_url = (
                            f"https://www.googleapis.com/youtube/v3/videos"
                            f"?part=statistics&id={','.join(video_ids)}&key={YOUTUBE_API_KEY}"
                        )
                        stats_res = await client.get(stats_url, headers=headers)
                        if stats_res.is_success:
                            for s_item in stats_res.json().get("items", []):
                                st = s_item.get("statistics", {})
                                stats_map[s_item["id"]] = {
                                    "likes": int(st.get("likeCount", 0)),
                                    "comments": int(st.get("commentCount", 0)),
                                    "views": int(st.get("viewCount", 0)),
                                }

                    for it in items:
                        vid_id = it.get("id", {}).get("videoId")
                        if not vid_id:
                            continue
                        snip = it.get("snippet", {})
                        title = snip.get("title", "")
                        desc = snip.get("description", "")
                        full_content = f"{title}\n\n{desc}".strip()
                        topic_name, topic_slug, _ = classify_text_to_topic(title, desc)
                        sent, sent_score = infer_sentiment_lexical(full_content)
                        st = stats_map.get(vid_id, {"likes": 0, "comments": 0, "views": 0})
                        thumb = snip.get("thumbnails", {}).get("high", {}).get("url") or f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg"

                        collected_posts.append({
                            "id": f"yt_{vid_id}",
                            "source": "youtube",
                            "author": f"@{snip.get('channelTitle', 'YouTubeCreator').replace(' ', '')}",
                            "text": full_content,
                            "url": f"https://www.youtube.com/watch?v={vid_id}",
                            "published_at": snip.get("publishedAt") or datetime.now(timezone.utc).isoformat(),
                            "likes": st["likes"],
                            "comments": st["comments"],
                            "shares": 0,
                            "topic_id": topic_slug,
                            "topic_name": topic_name,
                            "sentiment": sent,
                            "sentiment_score": sent_score,
                            "is_question": is_question_text(full_content),
                            "media_url": thumb,
                            "video_id": vid_id,
                        })
                except Exception as e:
                    logger.warning(f"Error querying YouTube for '{q}': {e}")
                    continue

        SEARCH_CACHE[cache_key] = {"data": collected_posts, "timestamp": now_ts}
        logger.info(f"Collected {len(collected_posts)} posts from YouTube Data API.")
        return collected_posts
    except Exception as e:
        logger.error(f"YouTube collection failed: {e}")
        return []

async def collect_google_news_posts(limit: int = 15) -> List[Dict[str, Any]]:
    """Collects live news articles from Google News RSS."""
    collected_posts: List[Dict[str, Any]] = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SocialPulse/1.0"}

    queries = ["Tata STRIVE", "skill development India youth", "electric vehicle vocational training", "solar technician course"]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for q in queries:
                encoded_q = httpx.URL(f"{q} skilling India")
                url = f"https://news.google.com/rss/search?q={encoded_q}&hl=en-IN&gl=IN&ceid=IN:en"
                try:
                    res = await client.get(url, headers=headers)
                    if not res.is_success:
                        continue
                    xml_text = res.text
                    items = re.findall(r"<item>([\s\S]*?)<\/item>", xml_text)

                    for idx, item_xml in enumerate(items[:5]):
                        title_m = re.search(r"<title>([\s\S]*?)<\/title>", item_xml)
                        link_m = re.search(r"<link>([\s\S]*?)<\/link>", item_xml)
                        pubdate_m = re.search(r"<pubDate>([\s\S]*?)<\/pubDate>", item_xml)
                        source_m = re.search(r"<source[^>]*>([\s\S]*?)<\/source>", item_xml)

                        if title_m and link_m:
                            raw_title = title_m.group(1).replace("<![CDATA[", "").replace("]]>", "").strip()
                            source_name = source_m.group(1).strip() if source_m else "National News"
                            link = link_m.group(1).strip()
                            pub_date = pubdate_m.group(1).strip() if pubdate_m else datetime.now(timezone.utc).isoformat()

                            topic_name, topic_slug, _ = classify_text_to_topic(raw_title)
                            sent, sent_score = infer_sentiment_lexical(raw_title)

                            collected_posts.append({
                                "id": f"gnews_{int(datetime.now().timestamp())}_{idx}_{hash(link)%10000}",
                                "source": "google_news",
                                "author": source_name,
                                "text": raw_title,
                                "url": link,
                                "published_at": datetime.now(timezone.utc).isoformat(),
                                "likes": 0,
                                "comments": 0,
                                "shares": 0,
                                "topic_id": topic_slug,
                                "topic_name": topic_name,
                                "sentiment": sent,
                                "sentiment_score": sent_score,
                                "is_question": "?" in raw_title,
                            })
                except Exception as e:
                    logger.warning(f"Error fetching Google News for '{q}': {e}")
                    continue

        logger.info(f"Collected {len(collected_posts)} posts from Google News RSS.")
        return collected_posts
    except Exception as e:
        logger.error(f"Google News collection failed: {e}")
        return []

async def collect_bluesky_posts(limit: int = 15) -> List[Dict[str, Any]]:
    """Collects real posts from Bluesky public AT Protocol search API."""
    collected_posts: List[Dict[str, Any]] = []
    headers = {"User-Agent": "SocialPulse-Collector/1.0", "Accept": "application/json"}
    queries = ["skilling", "employability", "apprenticeship"]

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            for q in queries:
                url = f"https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q={httpx.URL(q)}&limit=5&sort=latest"
                try:
                    res = await client.get(url, headers=headers)
                    if not res.is_success:
                        continue
                    posts_raw = res.json().get("posts", [])
                    for p in posts_raw:
                        record = p.get("record", {})
                        text = record.get("text", "")
                        if not text:
                            continue
                        author = f"@{p.get('author', {}).get('handle', 'bsky.user')}"
                        uri = p.get("uri", "")
                        rkey = uri.split("/")[-1] if uri else f"{int(datetime.now().timestamp())}"
                        post_url = f"https://bsky.app/profile/{p.get('author', {}).get('handle')}/post/{rkey}"

                        topic_name, topic_slug, _ = classify_text_to_topic(text)
                        sent, sent_score = infer_sentiment_lexical(text)

                        collected_posts.append({
                            "id": f"bsky_{p.get('cid', rkey)[:16]}",
                            "source": "bluesky",
                            "author": author,
                            "text": text,
                            "url": post_url,
                            "published_at": record.get("createdAt") or datetime.now(timezone.utc).isoformat(),
                            "likes": int(p.get("likeCount", 0)),
                            "comments": int(p.get("replyCount", 0)),
                            "shares": int(p.get("repostCount", 0)),
                            "topic_id": topic_slug,
                            "topic_name": topic_name,
                            "sentiment": sent,
                            "sentiment_score": sent_score,
                            "is_question": is_question_text(text),
                        })
                except Exception as e:
                    logger.warning(f"Error fetching Bluesky posts for '{q}': {e}")
                    continue

        logger.info(f"Collected {len(collected_posts)} posts from Bluesky AT Protocol.")
        return collected_posts
    except Exception as e:
        logger.error(f"Bluesky collection failed: {e}")
        return []

def aggregate_daily_metrics_from_posts():
    """
    Computes real daily counts per topic from stored SQLite posts and
    upserts into daily_topic_metrics with is_simulated = 0.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query daily aggregates of real stored posts
    cursor.execute("""
        SELECT 
            strftime('%Y-%m-%d', published_at) as post_date,
            topic_id,
            topic_name,
            COUNT(*) as total_mentions,
            SUM(CASE WHEN source = 'youtube' THEN 1 ELSE 0 END) as yt_count,
            SUM(CASE WHEN source = 'gdelt' THEN 1 ELSE 0 END) as gdelt_count,
            SUM(CASE WHEN source = 'bluesky' THEN 1 ELSE 0 END) as bsky_count,
            SUM(CASE WHEN source = 'google_news' THEN 1 ELSE 0 END) as gnews_count,
            SUM(CASE WHEN source = 'google_places' THEN 1 ELSE 0 END) as places_count,
            SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as pos_count,
            SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neu_count,
            SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as neg_count,
            SUM(likes + comments + shares) as total_eng
        FROM posts
        WHERE published_at IS NOT NULL
        GROUP BY strftime('%Y-%m-%d', published_at), topic_id
    """)
    rows = cursor.fetchall()
    conn.close()

    upserted = 0
    for r in rows:
        vol = r["total_mentions"]
        pos = r["pos_count"]
        neg = r["neg_count"]
        s_score = round((pos - neg) / max(1, vol), 2)
        upsert_daily_metrics({
            "date": r["post_date"],
            "topic_id": r["topic_id"],
            "topic_name": r["topic_name"],
            "mentions": vol,
            "youtube_count": r["yt_count"],
            "gdelt_count": r["gdelt_count"],
            "bluesky_count": r["bsky_count"],
            "gnews_count": r["gnews_count"],
            "places_count": r["places_count"],
            "positive_count": pos,
            "neutral_count": r["neu_count"],
            "negative_count": neg,
            "engagement": r["total_eng"] or 0,
            "sentiment_score": s_score,
            "is_simulated": 0,  # Real data!
        })
        upserted += 1

    logger.info(f"Aggregated daily metrics: {upserted} date-topic combinations recorded.")
    return upserted

def backfill_history_if_needed(target_days: int = 90):
    """
    Backfills daily metrics for past dates so history builds up continuously.
    1. Real days from stored posts are computed and marked is_simulated = 0.
    2. Prior dates lacking API archive access are seeded as historical baseline with is_simulated = 1.
    3. As real days accumulate from hourly fetch jobs, is_simulated = 0 automatically replaces them.
    """
    import random
    random.seed(42)

    now = datetime.now(timezone.utc)
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find existing dates per topic
    cursor.execute("SELECT DISTINCT date, topic_id FROM daily_topic_metrics")
    existing_pairs = set((row[0], row[1]) for row in cursor.fetchall())
    conn.close()

    added = 0
    for day_offset in range(target_days, -1, -1):
        cur_date = (now - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        weekday = (now - timedelta(days=day_offset)).weekday()
        seasonality = 1.15 if weekday in (1, 2, 3) else (0.80 if weekday == 6 else 0.95)

        for topic_name, rule in TAXONOMY_RULES.items():
            t_id = rule["slug"]
            if (cur_date, t_id) in existing_pairs:
                continue

            # Seed past baseline for uncollected historical dates, marked is_simulated = 1
            base_vol = 14 if "ai" in t_id or "ev" in t_id or "solar" in t_id else 18
            vol = max(2, int((base_vol + (target_days - day_offset) * 0.15 + random.uniform(-2, 2)) * seasonality))
            yt_cnt = int(vol * random.uniform(0.4, 0.6))
            gnews_cnt = max(0, vol - yt_cnt)
            pos = int(vol * 0.55)
            neg = int(vol * 0.15)
            neu = max(0, vol - pos - neg)

            upsert_daily_metrics({
                "date": cur_date,
                "topic_id": t_id,
                "topic_name": topic_name,
                "mentions": vol,
                "youtube_count": yt_cnt,
                "gdelt_count": 0,
                "bluesky_count": 0,
                "gnews_count": gnews_cnt,
                "places_count": 0,
                "positive_count": pos,
                "neutral_count": neu,
                "negative_count": neg,
                "engagement": int(yt_cnt * 25 + gnews_cnt * 10),
                "sentiment_score": 0.40,
                "is_simulated": 1,  # Explicitly marked simulated until real days overwrite it
            })
            added += 1

    logger.info(f"Backfill checked: {added} baseline historical slots created.")

async def run_pipeline_sync() -> Dict[str, Any]:
    """Orchestrates live multi-source collection, post insertion, and daily aggregation."""
    start_ts = datetime.now(timezone.utc)
    logger.info("Executing Social Pulse collection pipeline across YouTube, Google News & Bluesky...")

    # Fetch in parallel
    results = await asyncio.gather(
        collect_youtube_posts(),
        collect_google_news_posts(),
        collect_bluesky_posts(),
        return_exceptions=True
    )

    all_posts = []
    for r in results:
        if isinstance(r, list):
            all_posts.extend(r)

    # Insert into SQLite posts table (URL deduplicated)
    inserted_count = insert_posts_batch(all_posts)

    # Compute daily aggregates from all stored posts
    aggregate_daily_metrics_from_posts()

    # Ensure 90-day continuity
    backfill_history_if_needed()

    duration = round((datetime.now(timezone.utc) - start_ts).total_seconds(), 2)
    logger.info(f"Pipeline completed in {duration}s. Inserted {inserted_count} new posts.")

    return {
        "status": "success",
        "total_fetched": len(all_posts),
        "new_posts_inserted": inserted_count,
        "duration_seconds": duration,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
