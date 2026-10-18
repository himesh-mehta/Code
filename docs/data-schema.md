# Data Schema (shared contract)

Source of truth for all data shapes. JSON uses `snake_case`. The TypeScript mirror is `frontend/src/types/index.ts`. Change both together, by agreement.

Dates are ISO 8601 strings (`2026-10-17T09:30:00Z`); day-level series use `YYYY-MM-DD`.

## Enums

- `Platform`: `"twitter" | "linkedin" | "instagram" | "youtube" | "reddit" | "facebook" | "other"`
- `Sentiment`: `"positive" | "neutral" | "negative"`
- `Priority`: `"high" | "medium" | "low"`

## Post

| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `"p_0001"` |
| `platform` | Platform | |
| `author_handle` | string | anonymised or fictional for sample data |
| `content` | string | post text |
| `posted_at` | string | ISO datetime |
| `likes` | number | |
| `comments` | number | |
| `shares` | number | |
| `topic` | string | e.g. `"Interview preparation"` |
| `sentiment` | Sentiment | |
| `is_question` | boolean | audience asking something |
| `url` | string \| null | link if real data |
| `is_sample` | boolean | `true` for simulated or labelled sample posts |

```json
{
  "id": "p_0001",
  "platform": "twitter",
  "author_handle": "@student_rahul",
  "content": "Any tips for a first job interview? Freshers like me have no idea where to start.",
  "posted_at": "2026-10-15T08:20:00Z",
  "likes": 42,
  "comments": 11,
  "shares": 6,
  "topic": "Interview preparation",
  "sentiment": "neutral",
  "is_question": true,
  "url": null,
  "is_sample": true
}
```

## Topic (trend)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `post_count` | number | |
| `growth_pct` | number | change vs previous period, can be negative |
| `sentiment_breakdown` | `{ positive: number, neutral: number, negative: number }` | counts |
| `top_keywords` | string[] | |
| `trend_series` | `{ date: string, count: number }[]` | daily |
| `supporting_post_ids` | string[] | evidence |

## AudienceQuestion

| Field | Type |
|---|---|
| `id` | string |
| `text` | string (normalized question) |
| `count` | number |
| `topic` | string |
| `supporting_post_ids` | string[] |

## EngagementPattern

| Field | Type | Notes |
|---|---|---|
| `by_platform` | `{ platform: Platform, posts: number, avg_engagement: number }[]` | |
| `by_hour` | `{ hour: number, avg_engagement: number }[]` | hour 0–23 |

## Opportunity

| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `"opp_01"` |
| `title` | string | |
| `topic` | string | |
| `summary` | string | what the conversation is |
| `why_it_matters` | string | relevance to Tata STRIVE |
| `score` | number | 0–100 |
| `score_breakdown` | ScoreBreakdown | transparent criteria |
| `priority` | Priority | derived from score |
| `supporting_post_ids` | string[] | evidence |
| `recommended_action` | string | |
| `platforms` | Platform[] | where to engage |

### ScoreBreakdown

Each value 0–100. Weights are fixed and shown in the UI.

| Key | Meaning | Weight |
|---|---|---|
| `volume` | how many posts | 0.25 |
| `growth` | how fast it is growing | 0.25 |
| `relevance` | fit with Tata STRIVE's mission | 0.25 |
| `engagement` | likes, comments, shares | 0.15 |
| `sentiment_gap` | unmet need or negative/unanswered sentiment | 0.10 |

`score = round(sum(value * weight))`. Priority: `high` ≥ 70, `medium` 40–69, `low` < 40.

> If Developer 3 changes the criteria or weights, update this table; the UI reads weights from the API response, not hardcoded.

The `Opportunity` object therefore also carries `score_weights: Record<keyof ScoreBreakdown, number>`.

## Campaign

| Field | Type |
|---|---|
| `opportunity_id` | string |
| `generated_at` | string (ISO datetime) |
| `content_ideas` | `{ format: string, title: string, description: string }[]` |
| `captions` | `{ platform: Platform, text: string }[]` |
| `key_messages` | string[] |
| `call_to_action` | string |
| `success_metrics` | `{ metric: "shares" \| "saves" \| "comments" \| "clicks", target: string }[]` |

## Overview (dashboard summary)

| Field | Type |
|---|---|
| `is_sample` | boolean |
| `last_updated` | string (ISO datetime) |
| `total_posts` | number |
| `sentiment_breakdown` | `{ positive: number, neutral: number, negative: number }` |
| `top_topics` | Topic[] (up to 5) |
| `top_questions` | AudienceQuestion[] (up to 5) |
| `top_opportunities` | Opportunity[] (up to 3) |

## Paginated posts response

```json
{ "items": [Post], "total": 120, "page": 1, "page_size": 20 }
```

## Error response

```json
{ "error": { "code": "string", "message": "string" } }
```
