import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db import get_setting, set_setting, get_all_settings
from app.impact_service import get_official_impact

class TestOverviewAndSettings(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_official_impact_metrics_structure(self):
        """Verify official Tata STRIVE impact metrics follow strict attribution schema."""
        impact_data = get_official_impact()
        self.assertIn("cumulative_metrics", impact_data)
        self.assertIn("annual_outcomes", impact_data)
        self.assertTrue(len(impact_data["cumulative_metrics"]) >= 4)
        self.assertTrue(len(impact_data["annual_outcomes"]) >= 5)

        for metric in impact_data["cumulative_metrics"] + impact_data["annual_outcomes"]:
            self.assertTrue(metric.get("name"))
            self.assertTrue(metric.get("source_url", "").startswith("https://tatastrive.com"))
            self.assertTrue(metric.get("reporting_period"))
            self.assertTrue(metric.get("verified_date"))
            self.assertTrue(metric.get("value") > 0)
            self.assertIn("is_cumulative", metric)

    def test_official_impact_endpoint(self):
        """Test GET /api/official-impact returns HTTP 200 with verified metrics."""
        response = self.client.get("/api/official-impact")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["status"], ["success", "verified_published_report"])
        self.assertIn("cumulative_metrics", data)
        self.assertIn("annual_outcomes", data)

    def test_settings_persistence(self):
        """Test getting and updating settings stored in SQLite."""
        get_res = self.client.get("/api/settings")
        self.assertEqual(get_res.status_code, 200)

        update_payload = {
            "data_collection": {
                "refresh_interval_minutes": 45,
                "keywords": ["Tata STRIVE", "Skill India", "Vocational Training", "Youth Empowerment"]
            },
            "ai_analysis": {
                "groq_model": "llama-3.3-70b-versatile"
            }
        }
        post_res = self.client.post("/api/settings", json=update_payload)
        self.assertEqual(post_res.status_code, 200)

        # Verify DB directly
        dc = get_setting("data_collection")
        self.assertIsNotNone(dc)
        self.assertEqual(dc.get("refresh_interval_minutes"), 45)

        ai = get_setting("ai_analysis")
        self.assertIsNotNone(ai)
        self.assertEqual(ai.get("groq_model"), "llama-3.3-70b-versatile")

        # Verify via GET endpoint
        verify_res = self.client.get("/api/settings")
        self.assertEqual(verify_res.status_code, 200)
        updated = verify_res.json()["settings"]
        self.assertEqual(updated["data_collection"]["refresh_interval_minutes"], 45)
        self.assertEqual(updated["ai_analysis"]["groq_model"], "llama-3.3-70b-versatile")
        self.assertIn("Vocational Training", updated["data_collection"]["keywords"])

    def test_sources_health_endpoint(self):
        """Test GET /api/sources/health returns health of integrations."""
        response = self.client.get("/api/sources/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("integrations", data)
        source_names = [i["name"] for i in data["integrations"]]
        self.assertIn("YouTube Data API v3", source_names)
        self.assertIn("Google News RSS", source_names)
        self.assertIn("Bluesky (AT Protocol)", source_names)
        self.assertIn("Groq Fast Inference Engine", source_names)

    def test_overview_endpoint(self):
        """Test GET /api/overview returns valid schema with topics and last refresh dates."""
        response = self.client.get("/api/overview")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_posts", data)
        self.assertIn("relevant_posts", data)
        self.assertIn("questions_detected", data)
        self.assertIn("sentiment_breakdown", data)
        self.assertIn("top_topics", data)
        self.assertIn("top_impact_cards", data)
        self.assertIn("learner_voices", data)
        self.assertIn("telemetry_curve", data)
        self.assertIn("last_successful_refresh", data)
        self.assertIn("last_refresh_attempt", data)

    def test_overview_refresh_endpoint(self):
        """Test POST /api/overview/refresh initiates real synchronization."""
        response = self.client.post("/api/overview/refresh")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["status"], ["success", "partial", "failed", "busy", "already_running"])
        if data["status"] in ["success", "partial"]:
            self.assertIn("sources", data)
            self.assertIn("message", data)
            self.assertIn("last_successful_refresh", data)
            self.assertIn("last_attempt", data)

    @patch("app.api_endpoints.collect_youtube_posts", side_effect=RuntimeError("YouTube network timeout"))
    @patch("app.api_endpoints.collect_google_news_posts", side_effect=RuntimeError("Google News RSS 503"))
    @patch("app.api_endpoints.collect_bluesky_posts", side_effect=RuntimeError("Bluesky connection reset"))
    def test_failed_refresh_preserves_timestamp(self, mock_bsky, mock_gnews, mock_yt):
        """Test that a complete refresh failure preserves existing last_successful_refresh timestamp."""
        # Set an existing known timestamp
        initial_timestamp = "2026-10-17T12:00:00.000000+00:00"
        set_setting("last_successful_refresh", initial_timestamp)

        response = self.client.post("/api/overview/refresh")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "failed")
        self.assertIn("All data sources failed", data["message"])
        # Timestamp must be preserved, not updated to now!
        self.assertEqual(data["last_successful_refresh"], initial_timestamp)
        self.assertEqual(get_setting("last_successful_refresh"), initial_timestamp)

        # But last_attempt must record the failure!
        last_attempt = get_setting("last_refresh_attempt")
        self.assertEqual(last_attempt["status"], "failed")

if __name__ == "__main__":
    unittest.main()
