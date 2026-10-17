# API Contract (shared contract)

Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). All responses are JSON. Shapes are defined in `docs/data-schema.md`. Backend must enable CORS for the frontend origin.

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/api/health` | liveness check | `{ "status": "ok" }` |
| GET | `/api/overview` | dashboard summary | `Overview` |
| GET | `/api/posts` | listening feed | `PostsResponse` |
| GET | `/api/trends` | topics with trend series | `{ "items": Topic[] }` |
| GET | `/api/audience` | questions, sentiment, engagement | `{ "questions": AudienceQuestion[], "sentiment_breakdown": {...}, "engagement": EngagementPattern }` |
| GET | `/api/opportunities` | ranked opportunities | `{ "items": Opportunity[] }` (sorted by `score` desc) |
| GET | `/api/opportunities/{id}` | one opportunity | `Opportunity` |
| POST | `/api/campaigns/generate` | generate campaign | `Campaign` |
| POST | `/api/refresh` | re-run analysis on current data | `{ "status": "ok", "last_updated": string }` |

## GET `/api/posts`

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `query` | string | text search on `content` |
| `platform` | Platform | |
| `sentiment` | Sentiment | |
| `topic` | string | exact topic name |
| `is_question` | boolean | |
| `ids` | string | comma-separated post ids; used to load evidence. Overrides other filters |
| `sort` | `"recent"` \| `"engagement"` | default `recent` |
| `page` | number | default 1 |
| `page_size` | number | default 20, max 100 |

## POST `/api/campaigns/generate`

Request:
```json
{
  "opportunity_id": "opp_01",
  "tone": "friendly",
  "platform": "instagram"
}
```
- `opportunity_id` required.
- `tone` optional: `"friendly" | "professional" | "inspiring"`.
- `platform` optional: a Platform; if omitted, return captions for the opportunity's platforms.

Generation can take several seconds. The frontend shows a loading state and disables the button while pending. On failure, return the error shape and a non-2xx status.

## Status codes

- 200 success
- 400 invalid parameters
- 404 unknown opportunity id
- 500 server or LLM error, with the error shape from the schema doc

## Frontend rules for the API

- All calls go through `frontend/src/lib/api.ts`. No `fetch` inside components.
- Handle every non-2xx response by showing the `ErrorState` with retry.
- When `NEXT_PUBLIC_USE_MOCK=true`, `api.ts` returns data from `lib/mock.ts` that matches these shapes.
