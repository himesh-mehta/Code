/**
 * sampleData.ts — Fallback / Baseline Sample Datasets for Tata STRIVE Social Pulse
 * 
 * In accordance with hackathon rules:
 * - Real collected data is ALWAYS used as the single source of truth.
 * - If real data is missing or below minimum thresholds (< 20 posts),
 *   these values are shown WITH a visible "Sample data" badge.
 * - Old static data has been preserved here and NOT deleted.
 */

export interface SampleImpactCard {
  title: string;
  badge: string;
  badgeType: "lime" | "cyan" | "orange";
  metric: string;
  metricLabel: string;
  description: string;
  supportingPosts: number;
}

export const SAMPLE_TOP_IMPACT_CARDS: SampleImpactCard[] = [
  {
    title: "Solar PV Installation",
    badge: "Volume Leader",
    badgeType: "lime",
    metric: "3,890",
    metricLabel: "mentions (+18%)",
    description: "Maharashtra & Gujarat rooftop scheme subsidies drive surging queries on installer certifications.",
    supportingPosts: 3890,
  },
  {
    title: "Generative AI Prompting",
    badge: "Fastest Growing",
    badgeType: "cyan",
    metric: "5,120",
    metricLabel: "mentions (+32%)",
    description: "Office administration freshers actively seeking practical AI tools training to beat entry-level competition.",
    supportingPosts: 5120,
  },
  {
    title: "EV Diagnostics & Maintenance",
    badge: "Forecast Surge",
    badgeType: "orange",
    metric: "+45%",
    metricLabel: "30-day projected spike",
    description: "Two-wheeler commercial fleet hubs in Pune and Nashik face acute shortages of certified battery technicians.",
    supportingPosts: 4210,
  },
];

export const SAMPLE_LEARNER_VOICES = [
  {
    quote: "Which ITI trades have direct EV company placements in Pune?",
    author: "@Siddharth_Pawar",
    role: "ITI Electrical Student",
    hub: "Pune Centre",
    sentiment: "neutral" as const,
  },
  {
    quote: "Is hostel facility provided at STRIVE Chakan centre for outstation students?",
    author: "@Ankita_Mohite",
    role: "Automotive Aspirant",
    hub: "Chakan Hub",
    sentiment: "neutral" as const,
  },
  {
    quote: "Does solar technician course cover grid-tied inverter maintenance?",
    author: "@Kiran_Rathod",
    role: "Solar Trainee",
    hub: "Nashik Centre",
    sentiment: "positive" as const,
  },
];

export const SAMPLE_TRENDING_TOPICS = [
  {
    tag: "#EVDiagnostics & Battery Tech",
    growth: "+24%",
    mentions: "4,210 mentions",
    region: "Spike in Pune Hub",
  },
  {
    tag: "#SolarPVInstallation",
    growth: "+18%",
    mentions: "3,890 mentions",
    region: "Nashik & Sambhajinagar",
  },
  {
    tag: "#AIPromptingForOffice",
    growth: "+32%",
    mentions: "5,120 mentions",
    region: "Mumbai & Thane",
  },
];

export const SAMPLE_OPPORTUNITIES = [
  {
    id: "sample_opp_1",
    title: "EV diagnostics lab clarity & weekend schedule",
    topic: "EV diagnostics and battery tech",
    summary: "Identified 840 student questions asking if weekend EV courses provide hands-on battery test bench training in Pune.",
    why_it_matters: "Tata STRIVE's Chakan hub possesses state-of-the-art battery diagnostics rigs. Clear messaging converts hesitant ITI students.",
    score: 89,
    score_breakdown: { volume: 85, growth: 92, relevance: 95, engagement: 82, sentiment_gap: 88 },
    priority: "high" as const,
    recommended_action: "Publish video walkthroughs of the live high-voltage diagnostic lab with course coordinator Q&A.",
    target_audience: "Final year ITI electrical & motor mechanic students",
    suggested_cta: "Book a free diagnostic lab visit at Pune Chakan hub.",
    is_sample: true,
  },
  {
    id: "sample_opp_2",
    title: "Solar micro-grid entrepreneurship & subsidy guide",
    topic: "Solar PV installation",
    summary: "Rooftop solar queries increased +38% following national green energy announcements.",
    why_it_matters: "Graduates can launch localized installation and maintenance micro-enterprises rather than only seeking entry-level jobs.",
    score: 82,
    score_breakdown: { volume: 78, growth: 86, relevance: 90, engagement: 74, sentiment_gap: 80 },
    priority: "high" as const,
    recommended_action: "Launch a practical 3-part explainer series breaking down Mudra loan eligibility for solar certified graduates.",
    target_audience: "Rural youth, polytechnic diploma holders",
    suggested_cta: "Download the Solar Entrepreneurship Starter Pack.",
    is_sample: true,
  },
  {
    id: "sample_opp_3",
    title: "Clarifying stipend eligibility & scholarship myths",
    topic: "Employability and scholarships",
    summary: "First-generation learners frequently express skepticism regarding tool allowances and scholarship guarantees.",
    why_it_matters: "Addressing financial anxieties early improves onboarding conversion rates across Tier 2 and Tier 3 centres.",
    score: 76,
    score_breakdown: { volume: 72, growth: 70, relevance: 95, engagement: 68, sentiment_gap: 82 },
    priority: "medium" as const,
    recommended_action: "Produce short vertical reels with current scholarship recipients explaining the transparent stipend structure.",
    target_audience: "School dropouts, first-generation college students",
    suggested_cta: "Check your scholarship eligibility in 2 minutes.",
    is_sample: true,
  },
  {
    id: "sample_opp_4",
    title: "Generative AI for office productivity certification",
    topic: "AI and digital skills",
    summary: "Commerce and arts graduates worry about AI automating clerical jobs, creating high demand for practical upskilling.",
    why_it_matters: "Tata STRIVE can position practical office AI tools as a career enhancer rather than a career threat.",
    score: 68,
    score_breakdown: { volume: 80, growth: 75, relevance: 85, engagement: 62, sentiment_gap: 58 },
    priority: "medium" as const,
    recommended_action: "Host a live weekend masterclass on 'Prompting for Modern Excel & Business Communication'.",
    target_audience: "B.Com, B.A. freshers and junior administrative staff",
    suggested_cta: "Register for the Free AI Office Skills Masterclass.",
    is_sample: true,
  },
];

export const SAMPLE_OUTREACH_IDEAS = [
  {
    id: "ev-ama",
    title: "Host an AMA with certified EV technicians",
    description: "Demystify high-voltage safety and battery diagnostics career progression with live Q&A sessions.",
    target: "Final year ITI students",
    tag: "High Momentum",
    icon: "electric_bolt",
    topic: "EV diagnostics and battery tech",
  },
  {
    id: "solar-alumni",
    title: "Highlight Tata STRIVE alumni career journeys in Solar Energy",
    description: "Authentic grassroot success narratives emphasizing stable rooftop micro-grid entrepreneurship.",
    target: "Rural youth and parent groups",
    tag: "Alumni Spotlight",
    icon: "wb_sunny",
    topic: "Solar PV installation",
  },
  {
    id: "stipend-myths",
    title: "Clarify stipend & scholarship myths in short videos",
    description: "Short vertical reel explaining onboarding grants, course sponsorship, and tools allowance.",
    target: "First-generation learners",
    tag: "Mythbuster",
    icon: "payments",
    topic: "Employability and scholarships",
  },
  {
    id: "weekend-crash",
    title: "Weekend crash courses for working professionals",
    description: "Hybrid schedule tailored for technicians aiming to master PLC programming and IoT controllers.",
    target: "Upskilling candidates",
    tag: "Upskill Format",
    icon: "calendar_month",
    topic: "Industrial automation & PLC",
  },
];

export const SAMPLE_FAQS = [
  {
    id: "q1",
    question: "Do we get hands-on experience in EV diagnostics labs during the weekend course?",
    count: 840,
    surge: "+45% this week",
    topic: "EV diagnostics",
    suggestedReply: "Yes! All Tata STRIVE EV technician courses include 60% dedicated lab time working on live battery management test benches.",
  },
  {
    id: "q2",
    question: "Is there job placement assistance in Pune automotive companies after completing certification?",
    count: 1240,
    surge: "+28% this week",
    topic: "Job placement",
    suggestedReply: "Tata STRIVE partners with 120+ leading automotive manufacturers and certified service hubs across Pune and Nashik for campus placement drives.",
  },
  {
    id: "q3",
    question: "Can first-generation college students apply for scholarship stipends?",
    count: 690,
    surge: "+18% this week",
    topic: "Scholarships",
    suggestedReply: "Absolutely! Eligible candidates can access full tuition waivers and tool stipends under the STRIVE Affirmative Action initiative.",
  },
  {
    id: "q4",
    question: "Are certificates recognized by NSDC and National Skill Qualification Framework (NSQF)?",
    count: 520,
    surge: "+12% this week",
    topic: "Certification",
    suggestedReply: "All courses are aligned to NSQF Level 4/5 and co-certified by NSDC and Tata STRIVE, ensuring nationwide industry recognition.",
  },
];

export const SAMPLE_REPORTS = [
  {
    id: "sample_rep_1",
    name: "Weekly Skilling Sentiment Digest — Week 42",
    format: "pdf" as const,
    date: "Oct 21, 2024",
    size: "4.2 MB",
    scope: "14 Western Hubs",
    author: "Ananya Sharma",
  },
  {
    id: "sample_rep_2",
    name: "Monthly Automotive & EV Skilling 30-Day Forecast",
    format: "excel" as const,
    date: "Oct 18, 2024",
    size: "1.8 MB",
    scope: "8 Regional Hubs",
    author: "Pulse AI Engine",
  },
  {
    id: "sample_rep_3",
    name: "STRIVE Digital Skilling Multi-Channel Outreach Audit",
    format: "presentation" as const,
    date: "Oct 15, 2024",
    size: "12.4 MB",
    scope: "42 National Hubs",
    author: "Strategy Cell",
  },
  {
    id: "sample_rep_4",
    name: "Women in STEM Skilling Social Surge Brief",
    format: "pdf" as const,
    date: "Oct 10, 2024",
    size: "2.9 MB",
    scope: "National Campaign",
    author: "Ananya Sharma",
  },
  {
    id: "sample_rep_5",
    name: "Quarterly Vocational Placement Feedback Analysis",
    format: "excel" as const,
    date: "Oct 04, 2024",
    size: "3.1 MB",
    scope: "Automotive & Solar",
    author: "Admissions Directorate",
  },
];

export const SAMPLE_BEST_TIME_TO_POST = [
  { hour: "08:00", label: "8 AM", score: 65, peak: false },
  { hour: "10:00", label: "10 AM", score: 82, peak: false },
  { hour: "12:00", label: "12 PM", score: 91, peak: true },
  { hour: "14:00", label: "2 PM", score: 74, peak: false },
  { hour: "17:00", label: "5 PM", score: 88, peak: false },
  { hour: "19:00", label: "7 PM", score: 96, peak: true },
  { hour: "21:00", label: "9 PM", score: 84, peak: false },
];

export const SAMPLE_LEARNER_QUOTES = SAMPLE_LEARNER_VOICES;
export const SAMPLE_PAST_REPORTS = SAMPLE_REPORTS;

export const SAMPLE_TRENDS_CARDS = {
  most_discussed: {
    topic: "Green Energy & Solar Tech",
    topic_slug: "solar-and-green-energy",
    mentions: 14280,
    growth_pct: 12.4,
    status_chip: "Steady" as const,
    calculation_popover: "Sample baseline: 14,280 verified learner & mentor mentions.",
    programmes: ["Renewable Infrastructure Track"],
    proof_items: [
      {
        id: "sample_proof_solar_1",
        title: "PM Surya Ghar rooftop solar technician certification and practical installation guide",
        source: "youtube",
        author: "@SolarTechnicianIndia",
        published_at: "2024-10-14",
        url: "https://tatastrive.com/courses",
      },
      {
        id: "sample_proof_solar_2",
        title: "National rooftop scheme subsidies drive surging queries on installer certifications",
        source: "google_news",
        author: "Economic Times",
        published_at: "2024-10-15",
        url: "https://tatastrive.com",
      }
    ]
  },
  fastest_growing: {
    topic: "Generative AI for Office Productivity",
    topic_slug: "ai-and-digital-skills",
    mentions: 5120,
    growth_pct: 42.0,
    is_new: false,
    status_chip: "Growing" as const,
    calculation_popover: "Sample baseline: +42% spike across skill forums this week.",
    programmes: ["Digital Workplace Program"],
    proof_items: [
      {
        id: "sample_proof_ai_1",
        title: "Practical prompt engineering tools for non-technical office administrators",
        source: "youtube",
        author: "@TechSkilling",
        published_at: "2024-10-16",
        url: "https://tatastrive.com/courses",
      }
    ]
  },
  biggest_rise: {
    has_leader: true,
    topic: "Electric Vehicle Fleet Maintenance",
    topic_slug: "ev-and-battery",
    forecast_growth_pct: 54.0,
    status_chip: "Growing" as const,
    calculation_popover: "Sample baseline: +54% anticipated over the next 30 days.",
    programmes: ["Automotive Modernization"],
    proof_items: [
      {
        id: "sample_proof_ev_1",
        title: "High voltage battery safety diagnostics and charging station maintenance labs",
        source: "youtube",
        author: "@EVTrainingHub",
        published_at: "2024-10-15",
        url: "https://tatastrive.com/courses",
      }
    ]
  }
};

export const SAMPLE_EARLY_SIGNALS = [
  { topic: "Drone technology & remote pilot training", category: "Agri-Tech & Logistics", growth_pct: 38.0 },
  { topic: "Tele-Health GDA & bedside nursing", category: "Community Healthcare", growth_pct: 29.0 },
  { topic: "Industrial IoT & PLC automation", category: "Advanced Manufacturing", growth_pct: 22.0 },
  { topic: "Green hydrogen & clean tech technician", category: "Renewable Energy", growth_pct: 19.0 },
];


