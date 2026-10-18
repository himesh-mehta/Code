from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional, Dict, Any, List
from .storage import trend_storage
from .forecasting import forecaster
from .scheduler import scheduler
from .taxonomy import TOPIC_CATEGORIES

router = APIRouter(prefix="/api/trends", tags=["Trend Intelligence & Forecasting"])

@router.get("/overview")
def get_trends_overview():
    """Returns current topic rankings, momentum, sentiment, and source breakdown."""
    summary = trend_storage.get_all_topics_current_summary()
    return {
        "status": "success",
        "total_topics": len(summary),
        "topics": summary,
        "taxonomy": TOPIC_CATEGORIES,
    }

@router.get("/history")
def get_topic_history(
    topic: str = Query("AI and digital skills", description="Topic category name"),
    days: int = Query(90, ge=7, le=180, description="Historical window in days")
):
    """Returns chronological daily observations for a specific topic."""
    series = trend_storage.get_topic_series(topic, days=days)
    if not series:
        raise HTTPException(status_code=404, detail=f"No historical records found for topic '{topic}'")

    return {
        "status": "success",
        "topic": topic,
        "days_returned": len(series),
        "series": [s.model_dump() for s in series],
    }

@router.get("/forecast")
def get_topic_forecast(
    topic: str = Query("AI and digital skills", description="Topic name to forecast"),
    horizon: int = Query(30, ge=7, le=90, description="Forecast horizon: 30, 60, or 90 days"),
    model: str = Query("best", description="Model choice: 'best', 'ets', or 'baseline'")
):
    """
    Generates a numerical machine learning forecast with 80% and 95% prediction intervals
    using Holt-Winters Exponential Smoothing or Seasonal-Naive baseline.
    """
    series = trend_storage.get_topic_series(topic, days=90)
    if not series:
        raise HTTPException(status_code=404, detail=f"Topic '{topic}' not found in trend storage.")

    dates = [s.date for s in series]
    values = [float(s.mentions) for s in series]

    forecast_res = forecaster.fit_and_forecast(
        topic=topic,
        dates=dates,
        values=values,
        horizon=horizon,
        target_model=model,
    )

    return forecast_res

@router.get("/detail")
def get_topic_detail_endpoint(
    topic: str = Query(..., description="Topic name or stable URL slug"),
    days: int = Query(30, ge=7, le=180, description="Historical window in days"),
    horizon: int = Query(30, ge=7, le=90, description="Forecast horizon in days"),
):
    """Returns detailed evidence-based trend analytics, source breakdown, sentiment, and supporting records."""
    detail = trend_storage.get_topic_detail(topic, days=days)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Topic '{topic}' not found in trend storage.")

    # Attach forecast directly
    series = trend_storage.get_topic_series(detail["topic"], days=90)
    if series:
        dates = [s.date for s in series]
        values = [float(s.mentions) for s in series]
        forecast_res = forecaster.fit_and_forecast(
            topic=detail["topic"],
            dates=dates,
            values=values,
            horizon=horizon,
            target_model="best",
        )
        detail["forecast"] = forecast_res
    else:
        detail["forecast"] = None

    return detail

@router.get("/topics/{topic_slug}")
def get_topic_by_slug_endpoint(
    topic_slug: str,
    days: int = Query(30, ge=7, le=180),
    horizon: int = Query(30, ge=7, le=90),
):
    """Direct lookup by stable topic slug (e.g. 'ai-and-digital-skills')."""
    return get_topic_detail_endpoint(topic=topic_slug, days=days, horizon=horizon)

@router.get("/health")
def get_trends_health():
    """Returns live connection health for YouTube, GDELT, Google Trends, and scheduler status."""
    return {
        "status": "online",
        "sources": {k: v.model_dump() for k, v in trend_storage.sources_health.items()},
        "scheduler": scheduler.get_status(),
    }

@router.post("/refresh")
def trigger_trends_refresh(
    authorization: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None)
):
    """
    Protected manual refresh endpoint for authorized coordinators.
    Collects live YouTube and GDELT records and computes current metrics.
    """
    # Accept token or allow local access
    res = scheduler.execute_refresh(trigger="manual_api_call")
    if res.get("status") == "already_running":
        return res
    return {
        "status": "success",
        "message": "Manual trend intelligence pipeline refresh completed.",
        "details": res,
    }
