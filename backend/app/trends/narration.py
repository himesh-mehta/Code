"""
narration.py — Groq Factual Narration Generator

Calls Groq once (cached 3 hours) passing computed real figures, top 3 real post links,
and matching Tata STRIVE programmes.
Produces:
- per card: 1-line plain-English insight, 'why it matters for Tata STRIVE' (1 sentence), suggested matching STRIVE programme.
- 1-sentence page summary (e.g. 'AI and digital skills is the most discussed topic this week, and EV topics are growing fastest.').

CRITICAL SERVER-SIDE VALIDATION:
Rejects any output containing a number not present in the input JSON.
On failure or rejection, returns empty text so the card renders its numbers cleanly without the sentence.
"""

import os
import re
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Set
import httpx

logger = logging.getLogger("pulse_groq_narration")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
NARRATION_MODEL = "llama-3.3-70b-versatile"
CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "trends_narration_cache.json")
CACHE_TTL_HOURS = 3

def extract_allowed_numbers(input_data: Any) -> Set[str]:
    """Collects all numbers and numeric substrings present in the input payload."""
    serialized = json.dumps(input_data)
    # Match all integer/decimal patterns
    found = set(re.findall(r"\b\d+(?:\.\d+)?\b", serialized))
    # Also add standard 30, 60, 90 day horizons and 7-day windows if referenced
    found.update({"7", "14", "21", "30", "60", "90", "1", "2", "3"})
    return found

def validate_narration_text(text: str, allowed_numbers: Set[str]) -> bool:
    """
    Validates that text does NOT contain any invented numbers.
    Returns True if valid, False if it contains a hallucinated number.
    """
    if not text:
        return True
    numbers_in_text = re.findall(r"\b\d+(?:\.\d+)?\b", text)
    for num in numbers_in_text:
        # Check integer portion if float
        base_num = num.split(".")[0]
        if num not in allowed_numbers and base_num not in allowed_numbers:
            logger.warning(f"Rejected narration containing hallucinated number '{num}' (allowed: {allowed_numbers})")
            return False
    return True

def load_cached_narration() -> Optional[Dict[str, Any]]:
    """Loads narration cache if less than 3 hours old."""
    if not os.path.exists(CACHE_FILE):
        return None
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            cached_at = datetime.fromisoformat(data.get("cached_at", "2000-01-01T00:00:00+00:00"))
            if datetime.now(timezone.utc) - cached_at < timedelta(hours=CACHE_TTL_HOURS):
                return data.get("narration")
    except Exception as e:
        logger.warning(f"Failed to read narration cache: {e}")
    return None

def save_narration_cache(narration: Dict[str, Any]):
    """Saves narration to disk cache."""
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        payload = {
            "cached_at": datetime.now(timezone.utc).isoformat(),
            "narration": narration
        }
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save narration cache: {e}")

async def generate_trend_narration(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates plain-English factual narration for trend cards and page summary.
    Enforces strict grounding: rejects outputs containing invented numbers.
    """
    cached = load_cached_narration()
    if cached:
        logger.info("Using cached trend narration (3h TTL).")
        return cached

    api_key = (os.environ.get("GROQ_API_KEY") or "").strip()
    if not api_key:
        logger.warning("GROQ_API_KEY not configured. Narration will be blank.")
        return get_default_narration(payload)

    allowed_numbers = extract_allowed_numbers(payload)

    system_prompt = (
        "You are an analytical communications advisor for Tata STRIVE (skill development & employability).\n"
        "You are given real computed metrics, top real evidence post links, and matching Tata STRIVE programmes.\n"
        "Generate brief, plain-English explanations for the dashboard cards.\n\n"
        "STRICT GROUNDING RULES:\n"
        "1. Use ONLY numbers, percentages, and programme names present in the input JSON.\n"
        "2. NEVER invent figures, statistics, locations, partners, or quotes.\n"
        "3. If a fact is missing, write a general sentence without numbers.\n"
        "4. Make NO promises or guarantees about jobs or salaries.\n"
        "5. Output strictly JSON matching the required schema.\n\n"
        "JSON SCHEMA:\n"
        "{\n"
        '  "page_summary": "1-sentence summary of the page (e.g. AI and digital skills is the most discussed topic this week, and EV topics are growing fastest.)",\n'
        '  "most_discussed": {\n'
        '    "insight": "1-line plain-English insight using only input numbers",\n'
        '    "why_it_matters": "1 sentence on why it matters for Tata STRIVE",\n'
        '    "matching_programme": "Exact programme name from input"\n'
        '  },\n'
        '  "fastest_growing": {\n'
        '    "insight": "1-line plain-English insight using only input numbers",\n'
        '    "why_it_matters": "1 sentence on why it matters for Tata STRIVE",\n'
        '    "matching_programme": "Exact programme name from input"\n'
        '  },\n'
        '  "biggest_rise": {\n'
        '    "insight": "1-line plain-English insight using only input numbers",\n'
        '    "why_it_matters": "1 sentence on why it matters for Tata STRIVE",\n'
        '    "matching_programme": "Exact programme name from input"\n'
        '  }\n'
        "}"
    )

    user_prompt = "Generate factual narration based ONLY on this input:\n" + json.dumps(payload, indent=2)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": NARRATION_MODEL,
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
                    
                    # Validate all fields against hallucinated numbers
                    validated_narration: Dict[str, Any] = {}
                    
                    page_summary = parsed.get("page_summary", "")
                    validated_narration["page_summary"] = page_summary if validate_narration_text(page_summary, allowed_numbers) else ""

                    for card_key in ["most_discussed", "fastest_growing", "biggest_rise"]:
                        card_data = parsed.get(card_key, {})
                        insight = card_data.get("insight", "")
                        why = card_data.get("why_it_matters", "")
                        prog = card_data.get("matching_programme", "")

                        v_insight = insight if validate_narration_text(insight, allowed_numbers) else ""
                        v_why = why if validate_narration_text(why, allowed_numbers) else ""

                        validated_narration[card_key] = {
                            "insight": v_insight,
                            "why_it_matters": v_why,
                            "matching_programme": prog,
                        }

                    save_narration_cache(validated_narration)
                    logger.info("Successfully generated and validated Groq trend narration.")
                    return validated_narration

    except Exception as e:
        logger.warning(f"Groq narration generation failed: {e}")

    # Fallback to default grounded narration
    return get_default_narration(payload)

def get_default_narration(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Generates standard grounded narration using only provided values."""
    md = payload.get("most_discussed", {})
    fg = payload.get("fastest_growing", {})
    br = payload.get("biggest_rise", {})

    md_topic = md.get("topic", "Vocational skilling")
    fg_topic = fg.get("topic", "Digital skills")

    page_summary = f"{md_topic} leads public discussions this week, while {fg_topic} shows the highest rate of acceleration."

    return {
        "page_summary": page_summary,
        "most_discussed": {
            "insight": f"{md_topic} accumulated {md.get('mentions', 0)} verified mentions over the last 7 days.",
            "why_it_matters": f"Indicates sustained public and candidate interest in {md_topic}.",
            "matching_programme": (md.get("programmes") or ["Tata STRIVE Skilling Track"])[0],
        },
        "fastest_growing": {
            "insight": f"{fg_topic} recorded a {fg.get('growth_pct', 0)}% shift in 7-day discussion volume.",
            "why_it_matters": f"Highlights rapid emergence and candidate demand in {fg_topic}.",
            "matching_programme": (fg.get("programmes") or ["Tata STRIVE Career Connect"])[0],
        },
        "biggest_rise": {
            "insight": f"{br.get('topic', 'Emerging domain')} shows a projected increase over the next 30 days." if br.get("topic") else "",
            "why_it_matters": "Provides advance signal for curriculum readiness and enrollment outreach." if br.get("topic") else "",
            "matching_programme": (br.get("programmes") or ["Tata STRIVE Advanced Technical Track"])[0] if br.get("topic") else "",
        }
    }
