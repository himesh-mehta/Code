"""
backend/app/ai/service.py — Groq LLM Generation Service for Tata STRIVE Social Pulse

Features:
- Dual-model pipeline: llama-3.3-70b-versatile (primary) -> llama-3.1-8b-instant (fallback)
- In-memory 30-minute response caching (SHA-256 hash)
- Per-IP rate limiting (10 req/min) & global rate limiting (200 req/day)
- Retry with exponential backoff on 429/5xx before fallback
- JSON schema validation
- Token usage logging
"""

import os
import json
import time
import hashlib
import logging
from typing import Dict, Any, Optional, Tuple
from collections import defaultdict

import httpx
from dotenv import load_dotenv

from .rules import (
    SYSTEM_PROMPT,
    ALLOWED_KINDS,
    ALLOWED_PLATFORMS,
    ALLOWED_TONES,
    ALLOWED_LANGUAGES,
    sanitize_context_data,
)

load_dotenv()

logger = logging.getLogger("pulse_groq_ai")
logging.basicConfig(level=logging.INFO)

PRIMARY_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# --- In-Memory Cache (30 min TTL) ---
# Key: SHA-256 hash -> (timestamp, response_data)
_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes

def _get_cache_key(payload: Dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def get_cached_response(cache_key: str) -> Optional[Dict[str, Any]]:
    if cache_key in _cache:
        cached_time, data = _cache[cache_key]
        if time.time() - cached_time < CACHE_TTL_SECONDS:
            logger.info("Serving Groq generation from 30-min cache (key: %s...)", cache_key[:8])
            return data
        else:
            del _cache[cache_key]
    return None

def set_cached_response(cache_key: str, data: Dict[str, Any]):
    _cache[cache_key] = (time.time(), data)

# --- Rate Limiter ---
# Per IP: 10 requests / 60 seconds
# Global: 200 requests / 86400 seconds
_ip_requests: Dict[str, list] = defaultdict(list)
_global_requests: list = []

def check_rate_limits(client_ip: str) -> Tuple[bool, Optional[str]]:
    now = time.time()
    one_min_ago = now - 60
    one_day_ago = now - 86400

    # Clean global
    global _global_requests
    _global_requests = [t for t in _global_requests if t > one_day_ago]
    if len(_global_requests) >= 200:
        return False, "Daily generation quota reached (200 requests/day). Please try again tomorrow."

    # Clean per IP
    ip_history = [t for t in _ip_requests[client_ip] if t > one_min_ago]
    _ip_requests[client_ip] = ip_history
    if len(ip_history) >= 10:
        return False, "Rate limit exceeded (10 requests per minute). Please wait a moment before trying again."

    return True, None

def record_rate_limit_usage(client_ip: str):
    now = time.time()
    _ip_requests[client_ip].append(now)
    _global_requests.append(now)

# --- Validation Helper ---
def validate_generation_output(data: Any) -> Tuple[bool, Optional[str]]:
    """Checks that model response conforms to required JSON contract."""
    if not isinstance(data, dict):
        return False, "Model response is not a valid JSON object"
    
    if data.get("error") == "off_topic":
        return True, None

    required_fields = ["headline", "body", "cta", "visual_suggestion", "platform"]
    for field in required_fields:
        if field not in data or not isinstance(data[field], str):
            return False, f"Missing or invalid field: {field}"
            
    if "hashtags" not in data or not isinstance(data["hashtags"], list):
        data["hashtags"] = []
        
    if "variants" not in data or not isinstance(data["variants"], list):
        data["variants"] = []

    return True, None


class GroqAIService:
    @staticmethod
    def get_api_key() -> str:
        key = (os.environ.get("GROQ_API_KEY") or "").strip()
        return key

    @classmethod
    async def generate_content(
        cls,
        kind: str,
        topic: str,
        audience: str,
        platform: str,
        tone: str,
        language: str,
        context: str,
        client_ip: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        """
        Main entry point for AI generation with input validation, caching, rate limiting,
        primary/fallback model execution, and schema verification.
        """
        # 1. Input Length & Character Validation
        topic_clean = str(topic or "").strip()[:120]
        context_clean = sanitize_context_data(str(context or ""), max_chars=3000)
        audience_clean = str(audience or "Youth & Job Seekers").strip()[:80]
        platform_clean = str(platform or "linkedin").strip().lower()
        tone_clean = str(tone or "Friendly").strip()
        language_clean = str(language or "English").strip()

        if kind not in ALLOWED_KINDS:
            kind = "campaign"

        if platform_clean not in ALLOWED_PLATFORMS:
            platform_clean = "linkedin"

        if tone_clean not in ALLOWED_TONES:
            tone_clean = "Friendly"

        if language_clean not in ALLOWED_LANGUAGES:
            language_clean = "English"

        # 2. Check Cache
        cache_payload = {
            "kind": kind,
            "topic": topic_clean,
            "audience": audience_clean,
            "platform": platform_clean,
            "tone": tone_clean,
            "language": language_clean,
            "context": context_clean,
        }
        cache_key = _get_cache_key(cache_payload)
        cached = get_cached_response(cache_key)
        if cached:
            return cached

        # 3. Check Rate Limits
        allowed, rate_msg = check_rate_limits(client_ip)
        if not allowed:
            return {
                "error": "rate_limited",
                "message": rate_msg,
                "status_code": 429,
            }

        # 4. Check API Key
        api_key = cls.get_api_key()
        if not api_key:
            logger.warning("GROQ_API_KEY is not configured in backend/.env")
            return {
                "error": "groq_not_configured",
                "message": "GROQ_API_KEY is not configured in backend/.env. Please add a valid Groq API key to generate live AI content.",
                "status_code": 503,
            }

        # 5. Build User Prompt Grounded in Context
        user_prompt = f"""Generate a {kind.replace('_', ' ')} communication for Tata STRIVE.

TASK SPECIFICATIONS:
- Communication Type: {kind}
- Topic: {topic_clean}
- Target Audience: {audience_clean}
- Delivery Platform: {platform_clean}
- Tone: {tone_clean}
- Output Language: {language_clean}

VERIFIED FACTUAL CONTEXT (Use ONLY these facts; NEVER invent other statistics, partners, or links):
{context_clean if context_clean else 'General skilling advisory context for youth.'}

INSTRUCTIONS:
1. Ground the body and CTA strictly in the factual context provided.
2. Adhere to character limits: LinkedIn (600-1300 chars), Instagram (<=900 chars, max 6 hashtags), YouTube Shorts (30-45s script with timestamps), WhatsApp (<=500 chars, no hashtags).
3. For multi_channel, populate the 'variants' list with adaptations for all 4 platforms.
4. Output strictly JSON matching the required schema.
"""

        # 6. Call Groq with Primary Model -> Retry -> Fallback Model
        # 6. Call Groq with Primary Model -> Retry -> Fallback Model
        primary_model = os.environ.get("GROQ_PRIMARY_MODEL") or PRIMARY_MODEL
        fallback_model = os.environ.get("GROQ_FALLBACK_MODEL") or FALLBACK_MODEL
        candidate_models = [primary_model, fallback_model, "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
        models_to_try = []
        for m in candidate_models:
            if m and m not in models_to_try:
                models_to_try.append(m)


        last_error = ""
        encountered_rate_limit = False

        for model_idx, model_name in enumerate(models_to_try):
            for attempt in range(2):  # Try current model up to 2 times
                try:
                    logger.info("Calling Groq model '%s' (attempt %d/2)...", model_name, attempt + 1)
                    start_t = time.time()
                    
                    response_json, usage = await cls._invoke_groq_api(
                        api_key=api_key,
                        model=model_name,
                        system_prompt=SYSTEM_PROMPT,
                        user_prompt=user_prompt,
                        timeout_seconds=20.0,
                    )
                    
                    elapsed = time.time() - start_t
                    logger.info(
                        "Groq responded in %.2fs using '%s'. Tokens used: %s",
                        elapsed, model_name, usage
                    )

                    # Validate Schema
                    valid, err_msg = validate_generation_output(response_json)
                    if not valid:
                        logger.warning("Schema validation failed: %s. Retrying...", err_msg)
                        last_error = f"Invalid schema format from model: {err_msg}"
                        continue

                    # If off-topic detected by model
                    if response_json.get("error") == "off_topic":
                        return {
                            "error": "off_topic",
                            "message": "The requested topic is outside Tata STRIVE's skilling and employability mandate.",
                            "status_code": 400,
                        }

                    # Add metadata
                    response_json["model_used"] = model_name
                    response_json["tokens_used"] = usage
                    response_json["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    response_json["platform"] = platform_clean

                    # Record rate limit and set cache
                    record_rate_limit_usage(client_ip)
                    set_cached_response(cache_key, response_json)

                    return response_json

                except httpx.HTTPStatusError as e:
                    status_code = e.response.status_code
                    last_error = f"Groq HTTP error {status_code}: {e.response.text[:200]}"
                    logger.warning("Groq HTTP status %d for model '%s': %s", status_code, model_name, last_error)
                    
                    if status_code == 429:
                        encountered_rate_limit = True
                        time.sleep(5.0 * (attempt + 1))
                        continue

                    elif status_code in (500, 502, 503, 504):
                        time.sleep(1.5 * (attempt + 1))
                        continue
                    else:
                        # 404 model not found or other non-retryable status
                        break

                except httpx.TimeoutException:
                    last_error = "Groq request timed out (20s limit exceeded)"
                    logger.warning(last_error)
                    continue

                except Exception as exc:
                    last_error = f"Unexpected error during Groq generation: {str(exc)}"
                    logger.error(last_error)
                    continue

            logger.info("Switching to fallback model after exhausting attempts for '%s'...", model_name)

        if encountered_rate_limit:
            return {
                "error": "rate_limited",
                "message": "Groq upstream rate limit encountered. Please wait a few moments and try again.",
                "status_code": 429,
            }

        return {
            "error": "generation_failed",
            "message": f"Unable to generate AI content at this time: {last_error}",
            "status_code": 500,
        }


    @staticmethod
    async def _invoke_groq_api(
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        timeout_seconds: float = 20.0,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Makes direct asynchronous HTTP call to Groq chat completions endpoint in JSON mode."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
            "max_tokens": 700,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(GROQ_API_URL, json=body, headers=headers)
            resp.raise_for_status()
            res_data = resp.json()

        choices = res_data.get("choices", [])
        if not choices:
            raise ValueError("No choices returned from Groq API")

        raw_content = choices[0].get("message", {}).get("content", "{}")
        parsed_content = json.loads(raw_content)

        usage = res_data.get("usage", {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        })

        return parsed_content, usage
