"""
run_backfill.py — Historical Backfill & Immediate Ingestion CLI

Run with:
    python -m app.run_backfill
from the backend/ directory.
"""

import asyncio
import logging
from app.trends.collector import run_pipeline_sync
from app.audit_data import run_audit

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def main():
    print("=" * 80)
    print(" SOCIAL PULSE — INITIATING MULTI-SOURCE INGESTION & 90-DAY BACKFILL")
    print("=" * 80)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(run_pipeline_sync())
    loop.close()

    print("\n[INGESTION RESULT]")
    print(f" Status:             {result.get('status')}")
    print(f" Total Fetched:      {result.get('total_fetched')} items")
    print(f" Newly Inserted:     {result.get('new_posts_inserted')} posts")
    print(f" Execution Duration: {result.get('duration_seconds')} seconds")
    print("=" * 80)

    print("\nRunning post-ingestion audit...")
    run_audit()

if __name__ == "__main__":
    main()
