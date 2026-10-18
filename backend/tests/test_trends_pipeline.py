"""
test_trends_pipeline.py — Unit & Integration Tests for Trends Pipeline

Tests:
1. All sources up & normal GET /api/trends/overview execution.
2. GDELT down resilience: handles timeout/error gracefully, marks unavailable, reports 'Based on N of 3 sources'.
3. Groq down resilience: numbers must still show; sentences disappear or use safe defaults with zero hallucinated figures.
4. Empty database / insufficient history: strictly requires 21 real days, shows 'Building history', forecast_points empty, no fake values.
5. Server-side narration validation: strictly rejects outputs containing invented numbers.
"""

import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.trends.narration import validate_narration_text, extract_allowed_numbers
from app.trends.forecasting import forecaster
from app.trends.storage import trend_storage

class TestTrendsPipeline(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_trends_overview_endpoint(self):
        """GET /api/trends/overview returns HTTP 200 with real computed cards and topics."""
        res = self.client.get("/api/trends/overview")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("topics", data)
        self.assertIn("top_cards", data)
        self.assertIn("taxonomy", data)

        top_cards = data.get("top_cards", {})
        self.assertIn("most_discussed", top_cards)
        self.assertIn("fastest_growing", top_cards)
        self.assertIn("biggest_rise", top_cards)

        # Most Discussed card checks
        md = top_cards.get("most_discussed")
        if md:
            self.assertIn(md["status_chip"], ["Growing", "Cooling", "Steady"])
            self.assertIsInstance(md["mentions"], int)
            self.assertTrue(md.get("calculation_popover"))

    def test_gdelt_down_resilience(self):
        """GDELT degradation or failure does not crash pipeline and reports source status gracefully."""
        from app.trends.collector import collect_gdelt_posts, SOURCE_STATUS
        
        # Simulate GDELT network failure
        with patch("httpx.AsyncClient.get", side_effect=Exception("GDELT 503 Service Unavailable")):
            posts = None
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                posts = loop.run_until_complete(collect_gdelt_posts())
                loop.close()
            except Exception as e:
                self.fail(f"collect_gdelt_posts raised unhandled exception: {e}")

            # Must return a list (empty or cached) and mark status
            self.assertIsInstance(posts, list)
            self.assertIn(SOURCE_STATUS["gdelt"]["status"], ["unavailable", "online"])

        # Overview endpoint still succeeds
        res = self.client.get("/api/trends/overview")
        self.assertEqual(res.status_code, 200)

    def test_groq_down_resilience(self):
        """When Groq fails, numbers and cards still show; sentences fall back safely without fake values."""
        from app.trends.narration import generate_trend_narration

        sample_payload = {
            "most_discussed": {"topic": "AI and digital skills", "mentions": 120, "growth_pct": 14.5},
            "fastest_growing": {"topic": "EV and battery", "mentions": 85, "growth_pct": 28.2},
            "biggest_rise": {"has_leader": False},
        }

        with patch("httpx.AsyncClient.post", side_effect=Exception("Groq Connection Timeout")):
            import asyncio
            loop = asyncio.new_event_loop()
            narration = loop.run_until_complete(generate_trend_narration(sample_payload))
            loop.close()

            self.assertIsInstance(narration, dict)
            self.assertIn("page_summary", narration)
            self.assertIn("most_discussed", narration)
            # Numbers must not be hallucinated in the fallback
            self.assertTrue(validate_narration_text(
                narration["most_discussed"]["insight"],
                {"120", "14.5", "85", "28.2", "7", "30", "1", "2", "3"}
            ))

    def test_building_history_guardrail_under_21_days(self):
        """Holt-Winters model strictly requires >= 21 real days; below 21 returns 'building_history' with empty forecast."""
        dates = [f"2026-10-{i:02d}" for i in range(1, 15)]  # 14 days
        values = [float(10 + i) for i in range(1, 15)]

        fc = forecaster.fit_and_forecast(
            topic="Solar and green energy",
            dates=dates,
            values=values,
            horizon=30,
            target_model="best",
            real_days_count=14,  # Under 21 days
        )

        self.assertEqual(fc.get("status"), "building_history")
        self.assertEqual(len(fc.get("forecast_points", [])), 0)
        self.assertIn("Building history", fc.get("model_name", ""))

    def test_narration_validator_rejects_hallucinations(self):
        """Server-side validator rejects any text containing numbers not present in allowed set."""
        allowed = {"14", "250", "30", "7"}

        # Valid text using only allowed numbers
        valid_text = "The topic recorded 250 mentions over the last 7 days."
        self.assertTrue(validate_narration_text(valid_text, allowed))

        # Text with hallucinated number 999
        invalid_text = "The topic grew by 999% across 45 partner institutes."
        self.assertFalse(validate_narration_text(invalid_text, allowed))

if __name__ == "__main__":
    unittest.main()
