# AGENTS.md — Social Pulse (Tata STRIVE, 30-hour hackathon)

Read this file first. It applies to the whole repo. Frontend work: also read `frontend/AGENTS.md`.

## What we are building

**Social Pulse Intelligence** is an AI-powered social listening dashboard for Tata STRIVE (skill development, employability, entrepreneurship, youth development).

Core message:
> Social Pulse doesn't just tell Tata STRIVE what people are talking about. It helps the team understand why it matters and what to communicate next.

The differentiator is the **Conversation-to-Campaign Engine**: every insight must show supporting posts, explain why it matters to Tata STRIVE, be prioritized with transparent criteria, and lead to a generated campaign with a CTA and measurable outcomes.

## The four product modules

1. **Listening Feed**: posts about jobs, skills, entrepreneurship, youth, Tata STRIVE, with search and filters.
2. **Trend & Audience Intelligence**: trending topics, sentiment, frequently asked questions, engagement patterns.
3. **Opportunity Radar**: important conversations, why Tata STRIVE should act, priority score with breakdown.
4. **AI Campaign Studio**: content ideas, captions, key messages, CTA, success metrics for a chosen opportunity.

## Repo layout

```
/
├── AGENTS.md                  # this file
├── CLAUDE.md                  # points to AGENTS.md
├── docs/
│   ├── product-brief.md       # product context and user flows
│   ├── data-schema.md         # shared data schema (source of truth)
│   ├── api-contract.md        # agreed endpoints (source of truth)
│   ├── design-system.md       # tokens, components, UI rules
│   └── pages-and-components.md# page specs and component inventory
├── frontend/                  # Next.js + TypeScript + Tailwind + Recharts
├── backend/                   # FastAPI + Python
└── data/                      # sample posts JSON/CSV (clearly labelled sample data)
```

## Team boundaries

| Dev | Owns | Do not edit without telling the owner |
|---|---|---|
| 1 | `frontend/` | — |
| 2 | `backend/` API and data handling | schema, endpoints |
| 3 | AI analysis, trends, opportunity scoring, campaign generation | scoring criteria |
| 4 | `data/`, tests, integration, deployment, demo | — |

`docs/data-schema.md` and `docs/api-contract.md` are shared contracts. Change them only by agreement, and update `frontend/src/types/index.ts` in the same commit.

## Non-negotiable rules

1. **Sample data must be labelled.** Any screen showing simulated or labelled sample posts shows a visible "Sample data" badge. The hackathon allows sample data only if clearly labelled.
2. **Evidence first.** Every insight, trend and opportunity links to the actual supporting posts. Never show a claim without a way to see the evidence.
3. **Transparent scoring.** Opportunity priority shows its score breakdown, not just a number.
4. **Working, refreshable app**, not a static dashboard. Data comes from the API; a Refresh action re-fetches.
5. **Core workflow before extras.** Feed → Insights → Opportunity → Campaign must work end to end before any optional feature (misinformation detection, policy tracking, regional analysis).
6. **No secrets in the repo.** API keys live in `.env` files that are gitignored; commit `.env.example`.
7. Use only permitted public data, approved APIs or labelled sample posts.

## Conventions

- Language: TypeScript (strict) on the frontend, Python 3.11+ on the backend.
- Field names are `snake_case` in JSON, exactly as in `docs/data-schema.md`. Do not rename them in the frontend; map only at the UI layer if needed.
- Small commits, branch per feature (`feat/feed`, `feat/trends`, ...), merge to `main` often. Integrate early.
- Run lint and type checks before pushing.

## Commands

```bash
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:3000
cd frontend && npm run lint && npm run build

# Backend
cd backend && pip install -r requirements.txt
cd backend && uvicorn app.main:app --reload --port 8000
```

## 30-hour plan

| Hours | Objective |
|---|---|
| 0–3 | Repo, schema, sample dataset |
| 3–8 | Dashboard, API, listening feed |
| 8–14 | AI analysis, trends, opportunity scoring |
| 14–20 | Campaign generation, connect workflow |
| 20–25 | Integration, testing, deployment |
| 25–30 | Bug fixes, final demo, presentation |

## Definition of done (demo-ready)

- User can search and filter the feed.
- Overview shows trends, sentiment and top audience questions.
- Opportunity Radar ranks opportunities with evidence and score breakdown.
- Campaign Studio generates a campaign from a selected opportunity.
- Deployed URL works; Sample data badge is visible.
