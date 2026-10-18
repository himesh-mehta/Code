# Design System — Social Pulse

A calm, data-forward dashboard. Clarity over decoration. The user should find the answer to "what matters and what do I do next" quickly.

> Colors below are proposed tokens, not official Tata STRIVE brand colors. If the team has the official palette, swap the token values only; keep the token names.

## Tokens

Define as CSS variables in `src/app/globals.css` and map in the Tailwind theme.

```css
:root {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --border: #e3e6eb;
  --text: #14181f;
  --text-muted: #5b6573;

  --primary: #1f4fd8;        /* actions, links, active nav */
  --primary-soft: #e8eefc;

  --positive: #168a4c;
  --positive-soft: #e3f4ea;
  --neutral: #6b7280;
  --neutral-soft: #eef0f3;
  --negative: #c2342b;
  --negative-soft: #fbe9e7;

  --priority-high: #c2342b;
  --priority-medium: #b7791f;
  --priority-low: #6b7280;

  --radius: 12px;
  --shadow: 0 1px 2px rgba(20, 24, 31, 0.06);
}
```

Dark mode is optional; skip unless time remains.

## Typography

- Font: Inter (via `next/font/google`), fallback system sans.
- Page title: 24px / semibold. Section title: 18px / semibold. Body: 14px. Meta and captions: 12px, `--text-muted`.
- Numbers in KPI cards: 28px / semibold, tabular numerals.

## Spacing and layout

- 4px base unit. Cards use 16–20px padding; gaps between cards 16px.
- App shell: fixed left sidebar (240px), top bar (56px), content max-width 1280px.
- Grid: 12 columns on desktop; KPIs 4 across, charts 2 across, lists full width.

## Sentiment and priority are never color-only

Always pair color with a text label or icon (Positive / Neutral / Negative; High / Medium / Low).

| Concept | Color tokens | Label |
|---|---|---|
| Positive | `--positive`, `--positive-soft` | Positive |
| Neutral | `--neutral`, `--neutral-soft` | Neutral |
| Negative | `--negative`, `--negative-soft` | Negative |
| High priority | `--priority-high` | High |
| Medium priority | `--priority-medium` | Medium |
| Low priority | `--priority-low` | Low |

## Core components

| Component | Rules |
|---|---|
| `Card` | surface bg, 1px border, radius 12, subtle shadow |
| `Badge` | small pill; variants: sentiment, priority, platform, topic, sample |
| `Button` | variants: primary, secondary, ghost; loading state with spinner and disabled |
| `Input` / `Select` | visible label, focus ring in `--primary` |
| `Skeleton` | used for all loading states |
| `EmptyState` | icon, one-line explanation, action to reset filters |
| `ErrorState` | message and Retry button |
| `SampleDataBadge` | amber pill "Sample data", shown in the top bar when `is_sample` is true |

## Charts (Recharts)

- Wrap every chart in a Card with a title and a one-line takeaway under it (for example "Interview preparation grew 38% this week").
- Line chart for trends over time; donut for sentiment; horizontal bars for platform and question counts.
- Use token colors only. Tooltips show exact values. Provide a text alternative (aria-label or a small table).
- Fixed chart height 240–280px; `ResponsiveContainer` width 100%.

## Tone of copy

Plain, action-oriented. "Why this matters" and "Recommended action" sections use short sentences. Avoid jargon like "sentiment_gap" in the UI; show "Unmet need".

## Interaction rules

- Every list item that represents an insight has a clear next step (View posts, Open opportunity, Generate campaign).
- Show a loading state within 100ms of any request.
- Copy buttons show a "Copied" confirmation for 1.5 seconds.
- Filter changes update results without a full page reload and are reflected in the URL query string.
