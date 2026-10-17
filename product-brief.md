# Product Brief — Social Pulse Intelligence

## Context

Tata STRIVE works in skill development, employability, entrepreneurship and youth development. People discuss these topics across social media and other online platforms, but the information is scattered. The communications team cannot manually monitor everything.

## Problem

- Monitoring multiple platforms manually takes time.
- Audience interests and concerns are hard to consolidate.
- Emerging topics and engagement patterns get missed.
- Teams need help deciding what content to create and where to engage.

The goal is not to display social metrics. It is to explain **what is happening, why it matters, and what Tata STRIVE should do**.

## Primary user

A Tata STRIVE communications / content team member. They are busy, non-technical, and want to leave the dashboard with a concrete action: a piece of content to make and a reason to make it.

## How the system works (pipeline)

1. **Collect data**: permitted public data, approved APIs or labelled sample posts
2. **Analyse conversations**: topics, sentiment, audience questions, engagement
3. **Generate insights**: audience needs and emerging trends
4. **Identify opportunities**: prioritized conversations with supporting evidence
5. **Recommend content**: campaigns, captions, CTAs

Example: students repeatedly ask how to prepare for job interviews. Social Pulse detects the recurring concern, shows the supporting posts, and recommends interview-preparation videos, resume tips or career-readiness content.

## Modules and what the UI must do

### 1. Listening Feed (`/feed`)
- List relevant posts (jobs, skills, entrepreneurship, youth, Tata STRIVE).
- Search by text; filter by platform, sentiment, topic; sort by recent or engagement.
- Each post shows platform, author handle, content, date, engagement, sentiment, topic, and whether it is a question.

### 2. Trend & Audience Intelligence (`/trends`, and summary on `/`)
- Trending topics with growth and volume.
- Sentiment breakdown overall and per topic.
- Frequently asked questions, with counts and supporting posts.
- Engagement patterns by platform and by day/time.

### 3. Opportunity Radar (`/opportunities`, `/opportunities/[id]`)
- Ranked list of opportunities with priority (high/medium/low) and score.
- Each opportunity: title, summary, **why it matters to Tata STRIVE**, score breakdown, supporting posts, recommended action.
- Button to generate a campaign.

### 4. AI Campaign Studio (`/studio`)
- Pick or arrive with an opportunity.
- Optional controls: tone, target platform.
- Output: content ideas, captions per platform, key messages, call to action, success metrics (shares, saves, comments, clicks with targets).
- Copy buttons on every generated item.

## Differentiator: Conversation-to-Campaign Engine

Instead of saying "this topic is popular", the product:
- shows the actual supporting posts,
- explains why the topic matters to Tata STRIVE,
- prioritizes using transparent criteria,
- generates relevant content with a clear CTA,
- recommends measurable outcomes.

## Out of scope until core works

Misinformation detection, government policy tracking, regional analysis.

## Data honesty

The hackathon brief allows sample or simulated data for the demo if clearly labelled. The UI must show a visible **Sample data** badge when data is simulated.

## Success criteria for the demo

A judge can watch: Overview → top trend → supporting posts → top opportunity → why it matters + score breakdown → generate campaign → ideas, captions, CTA, metrics. No dead ends, refreshable data.
