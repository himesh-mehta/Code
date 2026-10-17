# Social Pulse — Tata STRIVE Social Intelligence

AI-powered social listening, trend analysis, and conversation-to-campaign dashboard designed for **Tata STRIVE** (skill development, youth employability, vocational education, and entrepreneurship).

> **Core Value**: Social Pulse doesn't just show what youth, students, and job-seekers are talking about. It helps the Tata STRIVE team understand *why it matters* and *what action or campaign to launch next*.

---

## 🚀 Quick Start (Team Onboarding)

### Prerequisites
- **Node.js**: v18.18+ or v20+ recommended
- **npm**: v9+ (or pnpm / yarn)
- **Git**

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/himesh-mehta/Code.git
   cd Code
   ```

2. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Environment Variables**:
   Copy the example environment template:
   ```bash
   cp .env.example .env.local
   ```
   *(Optional)* Add your API keys inside `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_data_api_v3_key
   ```
   > **Note**: Even without API keys, Social Pulse runs immediately with public Bluesky AT Protocol queries, GDELT DOC 2.0 News streams, and built-in CSV dataset ingestion!

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📦 Key Product Modules

| Module | Route | What It Does |
|---|---|---|
| **Overview Dashboard** | `/` | Executive KPIs, real-time sentiment distribution, top discussion themes, and critical signals. |
| **Social Listening Feed** | `/feed` | Live discourse stream from YouTube, Bluesky, GDELT DOC 2.0 News, and direct CSV file ingestion with advanced keyword, date, and sentiment filters. |
| **Trends & Insights** | `/trends` | Engagement timelines, topic volume breakdown, and top recurring questions from students and learners. |
| **Opportunity Radar** | `/opportunities` | Prioritized strategic opportunities for Tata STRIVE scored transparently with supporting evidence. |
| **AI Campaign Studio** | `/studio` | Generates multi-channel campaign messaging, CTAs, hashtags, and success metrics directly from prioritized opportunities. |

---

## 📊 CSV Dataset Ingestion

You can upload custom feedback surveys, offline center reviews, or student inquiries directly from the **Social Listening** page:

1. Go to **[Social Listening (`/feed`)](http://localhost:3000/feed)**.
2. Click **"Import CSV"** in the top action bar.
3. Choose either:
   - **Upload your own CSV**: Drag-and-drop or select any `.csv` file.
   - **1-Click Load Sample Records**: Click to instantly load 20 verified Tata STRIVE course feedback records (Solar PV, EV Technician, Healthcare, AI Skills).
   - **Download Sample CSV**: Download `data/tata_strive_student_feedback.csv` to inspect the format.

### Supported CSV Columns
```csv
content,author,platform,topic,sentiment,date,rating,likes,comments,is_question,url
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Visualization**: Recharts
- **Icons**: Lucide React
- **CSV Parser**: PapaParse
- **Data Connectors**:
  - YouTube Data API v3 (live video query & inline playback)
  - Bluesky AT Protocol API (public skilling discourse)
  - GDELT DOC 2.0 API (real-time news intelligence)

---

## 🔒 Security & Safe Development

- **No Secrets in Repo**: Never commit `.env` or `.env.local` files. All keys and tokens are strictly gitignored.
- **Sample Data Transparency**: Sample or simulated datasets display a visible "Sample data" badge per hackathon guidelines.
- **Evidence-First Scoring**: Every opportunity and insight links directly to verifiable supporting posts and student voices.

---

## 🧪 Available Scripts

```bash
# Run local dev server
npm run dev

# Run TypeScript and linter
npm run lint

# Build production bundle
npm run build

# Start production server
npm start
```
