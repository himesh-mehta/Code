"""
backend/app/ai/routes.py — FastAPI Router for Shared Groq AI Generation Endpoint

Endpoint:
POST /api/ai/generate
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel, Field

from .service import GroqAIService

router = APIRouter(prefix="/api/ai", tags=["Pulse AI Generation (Groq)"])

class GenerateContentRequest(BaseModel):
    kind: str = Field(default="campaign", description="campaign | opportunity_brief | outreach_post | faq_reply")
    topic: str = Field(default="Skilling & Employability", description="Opportunity topic or title (up to 120 chars)")
    audience: Optional[str] = Field(default="Youth & Job Seekers", description="Target audience cohort")
    platform: Optional[str] = Field(default="linkedin", description="linkedin | instagram | youtube_shorts | whatsapp | multi_channel")
    tone: Optional[str] = Field(default="Friendly", description="Friendly | Professional | Motivational | Informative")
    language: Optional[str] = Field(default="English", description="English | Hindi | Marathi")
    context: Optional[Any] = Field(default="", description="Factual context containing real post quotes, scores, or trend metrics")


@router.post("/generate")
async def generate_ai_content(req: GenerateContentRequest, request: Request, response: Response):
    """
    Shared AI generation endpoint powered by Groq (llama-3.3-70b-versatile with llama-3.1-8b-instant fallback).
    Enforces factual grounding, safety filters, 30-min caching, and rate limiting.
    """
    # Extract client IP for rate limiting
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = "127.0.0.1"

    result = await GroqAIService.generate_content(
        kind=req.kind,
        topic=req.topic,
        audience=req.audience or "Youth & Job Seekers",
        platform=req.platform or "linkedin",
        tone=req.tone or "Friendly",
        language=req.language or "English",
        context=req.context or "",
        client_ip=client_ip,
    )

    # Handle error cases with appropriate HTTP status codes
    if "error" in result:
        err_code = result.get("error")
        status_code = result.get("status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
        response.status_code = status_code
        return result

    return result
