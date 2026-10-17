# Pages and Components

Routes use the Next.js App Router. Data shapes: `docs/data-schema.md`. Endpoints: `docs/api-contract.md`.

## App shell (`app/layout.tsx`)

- Left `Sidebar`: Overview, Listening Feed, Trends & Audience, Opportunity Radar, Campaign Studio.
- `Topbar`: page title, `SampleDataBadge` (when `is_sample`), "Last updated" time, **Refresh** button (calls `POST /api/refresh`, then re-fetches current page data).

## Pages

### `/` Overview
Endpoint: `GET /api/overview`
- 4 `KpiCard`s: total posts, positive share, top trending topic (with growth %), open high-priority opportunities.
- `SentimentDonut`.
- `TopicList`: top 5 topics with growth badge; click goes to `/feed?topic=<name>`.
- `QuestionList`: top 5 audience questions with counts; "View posts" expands evidence.
- Top 3 `OpportunityCard`s with link to `/opportunities`.

### `/feed` Listening Feed
Endpoint: `GET /api/posts`
- `FeedFilters`: search box, platform, sentiment, topic, "questions only" toggle, sort.
- `PostList` of `PostCard`s with pagination (or "Load more").
- Filters sync to URL query params. Empty state offers "Clear filters".

### `/trends` Trend & Audience Intelligence
Endpoints: `GET /api/trends`, `GET /api/audience`
- `TrendLineChart` for selected topics (select up to 3).
- Topic table: name, posts, growth, sentiment mix, top keywords, "View posts".
- `SentimentDonut` overall; per-topic stacked bar.
- Questions section with counts and evidence.
- `EngagementBars` by platform; engagement by hour chart.

### `/opportunities` Opportunity Radar
Endpoint: `GET /api/opportunities`
- Ranked `OpportunityCard`s: priority badge, score, title, one-line "why it matters", platforms, buttons **View details** and **Generate campaign**.
- Filter by priority.

### `/opportunities/[id]` Opportunity detail
Endpoints: `GET /api/opportunities/{id}`, `GET /api/posts?ids=...`
- Header: title, priority, score.
- Summary, **Why it matters to Tata STRIVE**, **Recommended action**.
- `ScoreBreakdown`: one bar per criterion with its weight; total at top.
- `EvidencePosts`: the supporting posts.
- Primary button **Generate campaign** goes to `/studio?opportunity=<id>`.

### `/studio` AI Campaign Studio
Endpoints: `GET /api/opportunities`, `GET /api/opportunities/{id}`, `POST /api/campaigns/generate`
- `CampaignForm`: opportunity select (pre-filled from `?opportunity=`), tone, platform, **Generate** button with loading state.
- `CampaignOutput`: content ideas (cards), captions (per platform tabs), key messages, call to action, success metrics table.
- `CopyButton` on every generated item.
- Collapsed "Based on" panel showing the opportunity summary and evidence posts.

## Component inventory

| Component | Props (summary) | Used in |
|---|---|---|
| `Sidebar`, `Topbar`, `PageHeader` | nav state, title | all |
| `SampleDataBadge` | `visible` | topbar |
| `KpiCard` | `label`, `value`, `delta?`, `hint?` | overview |
| `PostCard` | `post: Post` | feed, evidence |
| `PostList` | `posts`, pagination | feed |
| `FeedFilters` | `value`, `onChange`, topic options | feed |
| `EvidencePosts` | `postIds`, lazy loads via `ids` param | trends, opportunities, studio |
| `TopicList` | `topics: Topic[]` | overview, trends |
| `QuestionList` | `questions: AudienceQuestion[]` | overview, trends |
| `TrendLineChart` | `topics`, `selectedIds` | trends |
| `SentimentDonut` | `breakdown` | overview, trends |
| `EngagementBars` | `engagement: EngagementPattern` | trends |
| `OpportunityCard` | `opportunity`, actions | overview, radar |
| `ScoreBreakdown` | `breakdown`, `weights`, `score` | opportunity detail |
| `CampaignForm` | `opportunities`, `onGenerate` | studio |
| `CampaignOutput` | `campaign: Campaign` | studio |
| `CopyButton` | `text` | studio |
| `Skeleton`, `EmptyState`, `ErrorState` | — | all data screens |

## Cross-page links (no dead ends)

| From | To |
|---|---|
| Topic (overview/trends) | `/feed?topic=<name>` |
| Question "View posts" | evidence panel inline |
| OpportunityCard | `/opportunities/<id>` and `/studio?opportunity=<id>` |
| Opportunity detail | `/studio?opportunity=<id>` |
| Studio "Based on" | `/opportunities/<id>` |

## Acceptance checklist per page

- [ ] Loading, empty, error, and success states
- [ ] Types imported from `src/types`
- [ ] Evidence reachable for every insight
- [ ] Works at 1280px and 768px
- [ ] Lint and build pass
