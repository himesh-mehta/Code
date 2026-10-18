import asyncio
import logging
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from .collector import run_pipeline_sync

logger = logging.getLogger("pulse_scheduler")

class TrendScheduler:
    def __init__(self):
        self._is_running = False
        self._lock = threading.Lock()
        self._last_run: Optional[str] = None
        self._last_status: str = "initialized"
        self._last_result: Dict[str, Any] = {}
        self._thread: Optional[threading.Thread] = None
        self.timezone_label = "Asia/Kolkata (IST)"

    def start(self):
        """Starts background monitoring loop for daily scheduled execution."""
        with self._lock:
            if self._is_running:
                return
            self._is_running = True
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()
            logger.info("Social Pulse Daily Trend Scheduler started (Asia/Kolkata timezone).")

    def _run_loop(self):
        """Loop running collection job every 3 hours as required by the pipeline."""
        while self._is_running:
            try:
                if self._last_run is None:
                    self.execute_refresh(trigger="initial_startup")
                else:
                    self.execute_refresh(trigger="scheduled_3_hourly")
                time.sleep(3 * 3600)  # Check and fetch every 3 hours
            except Exception as e:
                logger.error(f"Scheduler loop encountered error: {e}")
                time.sleep(60)

    def execute_refresh(self, trigger: str = "manual") -> Dict[str, Any]:
        """Atomically executes a refresh job preventing concurrent runs."""
        acquired = self._lock.acquire(blocking=False)
        if not acquired:
            return {
                "status": "already_running",
                "message": "A trend collection job is currently in progress. Please wait for completion.",
            }

        try:
            logger.info(f"Starting Trend Pipeline execution (Trigger: {trigger})...")
            start_ts = datetime.now(timezone.utc)
            # Run async pipeline sync in loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            res = loop.run_until_complete(run_pipeline_sync())
            loop.close()

            duration_sec = round((datetime.now(timezone.utc) - start_ts).total_seconds(), 2)
            self._last_run = datetime.now(timezone.utc).isoformat()
            self._last_status = "success"
            self._last_result = {
                **res,
                "trigger": trigger,
                "duration_seconds": duration_sec,
                "timezone": self.timezone_label,
            }
            logger.info(f"Trend Pipeline completed in {duration_sec}s: {res}")
            return self._last_result

        except Exception as e:
            logger.error(f"Trend Pipeline execution failed: {e}")
            self._last_status = "failed"
            self._last_result = {
                "status": "failed",
                "error": str(e),
                "trigger": trigger,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            return self._last_result
        finally:
            self._lock.release()

    def get_status(self) -> Dict[str, Any]:
        return {
            "scheduler_running": self._is_running,
            "timezone": self.timezone_label,
            "last_run": self._last_run,
            "last_status": self._last_status,
            "last_result": self._last_result,
            "scheduled_time": "02:00 AM IST daily",
        }

scheduler = TrendScheduler()
