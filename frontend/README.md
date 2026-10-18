# Social Pulse — Frontend Application (Next.js 16 + TypeScript)

Production web dashboard for **Social Pulse Intelligence** (Tata STRIVE), built with Next.js 16 (App Router with Turbopack), Tailwind CSS, and Recharts.

---

## ⚡ Quickstart

### 1. Prerequisites
- **Node.js**: v18.18+ or v20+ recommended
- **npm**: v9+ (or pnpm / yarn)

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Environment Variables
Copy the example environment template:
```bash
cp .env.example .env.local
```
*(Optional)* Add your API keys inside `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_key
```

### 4. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Build for Production
To verify TypeScript types and generate the optimized production bundle:
```bash
npm run build
npm run start
```

---

## 🧭 Page Architecture & Routes

| Route | Page File | Purpose |
| :--- | :--- | :--- |
| **`/`** | `src/app/page.tsx` | Executive Overview with top impact cards, learner voice quotes, and volume curve. |
| **`/feed`** | `src/app/feed/page.tsx` | Omni-channel listening stream with 5 live connectors, RoBERTa drawer, and CSV upload. |
| **`/trends`** | `src/app/trends/page.tsx` | Trend intelligence, Holt-Winters ETS forecast curve, and emerging vocational skills. |
| **`/opportunities`**| `src/app/opportunities/page.tsx` | Interactive Opportunity Map (Bubble Chart), 5-factor scoring, and 30-day momentum. |
| **`/studio`** | `src/app/studio/page.tsx` | AI Campaign Studio generating grounded LinkedIn, Instagram, and WhatsApp copy. |
| **`/audience`** | `src/app/audience/page.tsx` | Learner inquiries, authentic Tata STRIVE skill centres, and best time to post (IST). |
| **`/reports`** | `src/app/reports/page.tsx` | On-demand intelligence CSV report generator and direct file download. |

---

## 🎨 Theme & Design System
- **Primary Brand**: Tata STRIVE Deep Azure (`#00629e` / `#001e2d`) & Vibrant Lime (`#ebf875` / `#d4e838`).
- **Interactive States**: Smooth micro-transitions, accessible focus rings, and high contrast typography (Geist Sans).
- **Responsive Layout**: Collapsible sidebar, mobile drawer support, and responsive chart containers.

---

## 🔄 API Reverse Proxy
All frontend API calls to `/api/topics`, `/api/overview`, `/api/opportunities`, `/api/audience`, `/api/reports`, `/api/assistant`, and `/api/sentiment` are automatically reverse-proxied to FastAPI (`http://localhost:8000`) via `next.config.ts`, eliminating CORS errors.
