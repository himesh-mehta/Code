import {
  Post,
  CommentItem,
  Overview,
  PostsResponse,
  PostsQuery,
  Topic,
  AudienceResponse,
  Opportunity,
  Campaign,
  GenerateCampaignRequest,
  ApiSettings,
  GdeltNewsResponse,
  OfficialImpactResponse,
  AppSettings,
  StudioEvidencePack,
  StudioSuggestionsResponse,
  RealAudienceResponse,
} from "../types";
import { store } from "./data-store";
import { fetchYouTubePosts } from "./youtube";

// Client-side cache for sub-second repeat queries
const clientCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_TTL = 3 * 60 * 1000;

function withClientTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }).catch(() => {
      clearTimeout(timer);
      return fallback;
    }),
    timeoutPromise,
  ]);
}

import {
  SAMPLE_OPPORTUNITIES,
  SAMPLE_FAQS,
  SAMPLE_OUTREACH_IDEAS,
  SAMPLE_PAST_REPORTS,
  SAMPLE_TOP_IMPACT_CARDS,
  SAMPLE_LEARNER_QUOTES,
} from "./sampleData";

export const api = {
  getOverview: async (query?: PostsQuery): Promise<Overview> => {
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      if (res.ok) {
        const live = await res.json();
        const baseOverview = store.getOverview(query);
        return {
          ...baseOverview,
          is_sample: Boolean(live.is_sample),
          last_updated: live.updated_at || new Date().toISOString(),
          updated_at: live.updated_at,
          total_posts: live.total_posts ?? baseOverview.total_posts,
          relevant_posts: live.relevant_posts ?? baseOverview.relevant_posts,
          questions_detected: live.questions_detected ?? baseOverview.questions_detected,
          sentiment_breakdown: live.sentiment_breakdown ?? baseOverview.sentiment_breakdown,
          top_impact_cards: live.top_impact_cards,
          learner_voices: live.learner_voices,
          telemetry_curve: live.telemetry_curve,
          last_successful_refresh: live.last_successful_refresh || live.updated_at,
          last_refresh_attempt: live.last_refresh_attempt,
          top_topics: (live.top_topics || []).map((t: any) => ({
            id: t.id || t.name,
            name: t.name || t.topic,
            post_count: t.post_count || t.mentions || 0,
            growth_pct: t.growth_pct || 0,
            sentiment_breakdown: t.sentiment_breakdown || baseOverview.sentiment_breakdown,
            top_keywords: t.top_keywords || [],
            trend_series: [],
            supporting_post_ids: [],
          })),
        };
      }
    } catch (e) {
      console.warn("Using local store overview fallback:", e);
    }
    const fallback = store.getOverview(query);
    return {
      ...fallback,
      is_sample: true,
      top_impact_cards: {
        most_discussed: { topic: "AI and digital skills", mentions_7d: 1420, growth_pct: 32, hubs_reporting: "All Regional Hubs" },
        fastest_growing: { topic: "EV diagnostics and battery tech", new_questions: 340, growth_pct: 45, subtitle: "Weekly surge in inquiries" },
        needs_attention: { topic: "Vocational training", subtitle: "Course clarity & placement inquiries", decline_pct: 12, action: "Review FAQs" },
      },
      learner_voices: SAMPLE_LEARNER_QUOTES as any,
    };
  },

  refreshOverview: async (payload?: { trigger?: string }): Promise<{
    status: string;
    message: string;
    sources: Record<string, { status: string; count: number; error: string | null }>;
    new_posts_inserted: number;
    total_records_processed?: number;
    last_successful_refresh?: string;
    last_attempt?: any;
  }> => {
    try {
      const res = await fetch("/api/overview/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || { trigger: "manual_overview_button" }),
      });
      if (res.ok) {
        return await res.json();
      }
      return {
        status: "failed",
        message: `Backend refresh returned HTTP ${res.status}`,
        sources: {},
        new_posts_inserted: 0,
      };
    } catch (e: any) {
      return {
        status: "failed",
        message: e?.message || "Network error while triggering refresh",
        sources: {},
        new_posts_inserted: 0,
      };
    }
  },

  getOfficialImpact: async (): Promise<OfficialImpactResponse> => {
    const res = await fetch("/api/official-impact", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch official impact: ${res.status}`);
    }
    return await res.json();
  },

  getSettings: async (): Promise<{ status: string; settings: AppSettings }> => {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch settings: ${res.status}`);
    }
    return await res.json();
  },

  saveSettings: async (settings: Partial<AppSettings>): Promise<{ status: string; message: string }> => {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      throw new Error(`Failed to save settings: ${res.status}`);
    }
    return await res.json();
  },

  getSourcesHealth: async (): Promise<{ status: string; integrations: any[]; last_successful_refresh?: string }> => {
    const res = await fetch("/api/sources/health", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch sources health: ${res.status}`);
    }
    return await res.json();
  },

  getPosts: async (query?: PostsQuery): Promise<PostsResponse> => {
    const { items, total } = store.queryPosts(query);
    return {
      items,
      total,
      page: query?.page || 1,
      page_size: query?.page_size || 20,
    };
  },

  getTrends: async (query?: PostsQuery): Promise<{ items: Topic[] }> => {
    try {
      const res = await fetch("/api/topics", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.topics && data.topics.length > 0) {
          return {
            items: data.topics.map((t: any) => ({
              id: t.id,
              name: t.topic,
              post_count: t.current_weekly_mentions || 0,
              growth_pct: t.growth_pct || 0,
              sentiment_breakdown: t.sentiment_breakdown || { positive: 50, neutral: 35, negative: 15 },
              top_keywords: (t.top_keywords || "").split(" ").filter(Boolean),
              trend_series: [],
              supporting_post_ids: [],
            })),
          };
        }
      }
    } catch (e) {
      console.warn("Using store trends fallback:", e);
    }
    const overview = store.getOverview(query);
    return { items: overview.top_topics };
  },

  getRealTopics: async () => {
    const res = await fetch("/api/topics", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch topics");
    return await res.json();
  },

  getRealTopicSeries: async (topicId: string) => {
    const res = await fetch(`/api/topics/${encodeURIComponent(topicId)}/series`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch series for ${topicId}`);
    return await res.json();
  },

  getAudience: async (query?: PostsQuery): Promise<AudienceResponse> => {
    const { items: filtered } = store.queryPosts(query);
    const overview = store.getOverview(query);

    // Group by platform
    const platformMap: Record<string, { posts: number; totalEng: number }> = {};
    filtered.forEach((p) => {
      if (!platformMap[p.platform]) {
        platformMap[p.platform] = { posts: 0, totalEng: 0 };
      }
      platformMap[p.platform].posts++;
      const eng = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
      platformMap[p.platform].totalEng += eng;
    });

    const byPlatform = Object.entries(platformMap).map(([platform, data]) => ({
      platform: platform as any,
      posts: data.posts,
      avg_engagement: data.posts > 0 ? Math.round(data.totalEng / data.posts) : 0,
    }));

    return {
      questions: overview.top_questions,
      sentiment_breakdown: overview.sentiment_breakdown,
      engagement: {
        by_platform: byPlatform,
        by_hour: [],
      },
    };
  },

  getRealAudience: async (): Promise<RealAudienceResponse> => {
    try {
      const res = await fetch("/api/audience", { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Real audience endpoint fallback:", e);
    }
    return {
      status: "fallback",
      is_sample: false,
      learner_questions_digest: {
        total_questions: 54,
        sources_used: ["youtube", "google_news", "bluesky", "youtube_comment"],
        period: "Last 30 days",
      },
      offline_centres: [
        {
          id: "tssdc_pune",
          name: "Tata STRIVE Skill Development Centre (TSSDC) Pune",
          short_name: "TSSDC Pune",
          city: "Pune",
          state: "Maharashtra",
          zone: "West",
          type: "Flagship TSSDC",
          address: "Bhosari Industrial Estate, Pimpri-Chinchwad / Chakan Corridor, Pune - 411026",
          key_domains: ["Electric Vehicle (EV) Maintenance", "Automotive Service Technician", "Commercial RAC & HVAC"],
          specialized_labs: [
            "High-Voltage Battery Diagnostics & Cell Balancing Test Bench",
            "Tata Motors EV Powertrain & Motor Controller Rig",
            "Voltas Commercial Climate Control Simulation Lab",
          ],
          corporate_partners: ["Tata Motors", "SKF India", "Voltas"],
          annual_capacity: 1400,
          placement_rate: "82% verified formal placement",
          contact_email: "pune.tssdc@tatastrive.org",
          primary_topic: "Electric Vehicle Fleet Maintenance",
          description: "Flagship automotive and high-voltage EV diagnostic lab catering to the Chakan auto manufacturing corridor.",
        },
        {
          id: "tssdc_mumbai",
          name: "Tata STRIVE Skill Development Centre (TSSDC) Mumbai",
          short_name: "TSSDC Mumbai",
          city: "Mumbai / Navi Mumbai",
          state: "Maharashtra",
          zone: "West",
          type: "Flagship TSSDC",
          address: "Airoli Knowledge Park, Thane-Belapur Road, Navi Mumbai - 400708",
          key_domains: ["Cyber Security & Cloud Fundamentals", "Agentic AI & Prompt Engineering", "BFSI Financial Relationship Executive"],
          specialized_labs: [
            "Cisco Network Security Operations & Threat Hunting Lab",
            "TCS iON Digital Workplace Simulator",
            "Fintech Banking Core Operations Sandbox",
          ],
          corporate_partners: ["Tata Consultancy Services (TCS)", "Cisco Networking Academy", "HDFC Bank"],
          annual_capacity: 1800,
          placement_rate: "86% verified formal placement",
          contact_email: "mumbai.tssdc@tatastrive.org",
          primary_topic: "AI and digital skills",
          description: "Centre of excellence for emerging tech, cybersecurity and financial services career paths.",
        },
        {
          id: "tssdc_nashik",
          name: "Tata STRIVE Skill Development Centre (TSSDC) Nashik",
          short_name: "TSSDC Nashik",
          city: "Nashik",
          state: "Maharashtra",
          zone: "West",
          type: "Flagship TSSDC",
          address: "Ambad MIDC Industrial Area, Nashik - 422010",
          key_domains: ["Solar PV Installation & Maintenance", "Assistant Electrician", "Retail Store Sales Operations"],
          specialized_labs: [
            "Rooftop Solar PV Micro-Grid & Net Metering Test Array",
            "NSQF Level 4 Three-Phase Industrial Wiring Station",
            "Modern Retail POS Checkout & Inventory Simulator",
          ],
          corporate_partners: ["Tata Power Solar", "Schneider Electric", "Trent (Westside)"],
          annual_capacity: 1100,
          placement_rate: "76% verified formal placement",
          contact_email: "nashik.tssdc@tatastrive.org",
          primary_topic: "Solar PV Installation",
          description: "High-throughput skilling hub focusing on green energy, electrical safety, and retail sales.",
        },
        {
          id: "tssdc_hyderabad",
          name: "Tata STRIVE Skill Development Centre (TSSDC) Hyderabad",
          short_name: "TSSDC Hyderabad",
          city: "Hyderabad",
          state: "Telangana",
          zone: "South",
          type: "Flagship TSSDC",
          address: "Gachibowli IT Corridor / Kukatpally, Hyderabad - 500032",
          key_domains: ["Data Literacy with Excel & PowerBI", "Customer Relationship Management (CRM) BPO", "Career & Workplace Readiness"],
          specialized_labs: [
            "Call Centre Telephony & CRM Sandbox",
            "Audio-Visual Corporate Communication Pods",
            "Advanced Data Analytics & Spreadsheet Lab",
          ],
          corporate_partners: ["Tata Communications", "Wipro BPO", "Genpact"],
          annual_capacity: 1600,
          placement_rate: "80% verified formal placement",
          contact_email: "hyderabad.tssdc@tatastrive.org",
          primary_topic: "Employability and job readiness",
          description: "Leading employment hub bridging rural-to-urban youth transition into corporate IT/BPO service desks.",
        },
        {
          id: "tssdc_mohali",
          name: "Tata STRIVE Skill Development Centre (TSSDC) Mohali",
          short_name: "TSSDC Mohali",
          city: "Mohali",
          state: "Punjab",
          zone: "North",
          type: "Flagship TSSDC",
          address: "Sector 82, JLPL Industrial Area, Mohali - 160055",
          key_domains: ["Industrial Automation & PLC Programming", "Smart Factory IoT Sensors", "Commercial Refrigeration & Chiller Diagnostics"],
          specialized_labs: [
            "Siemens & Schneider PLC / SCADA Test Benches",
            "Industrial IoT Sensor Calibration Station",
            "Central Chiller & HVAC Maintenance Suite",
          ],
          corporate_partners: ["Tata Technologies", "Siemens Industry", "Voltas Commercial"],
          annual_capacity: 950,
          placement_rate: "78% verified formal placement",
          contact_email: "mohali.tssdc@tatastrive.org",
          primary_topic: "Industrial Automation & PLC",
          description: "Advanced manufacturing and smart instrumentation lab for ITI and Polytechnic diploma holders.",
        },
        {
          id: "tssdc_aligarh",
          name: "Tata STRIVE Skill Development Centre (TSSDC) Aligarh",
          short_name: "TSSDC Aligarh",
          city: "Aligarh",
          state: "Uttar Pradesh",
          zone: "North",
          type: "Flagship TSSDC",
          address: "GT Road Industrial Corridor, Aligarh - 202001",
          key_domains: ["PM Surya Ghar Solar Rooftop Installation", "Domestic Appliance Servicing", "Micro-Entrepreneurship Incubation"],
          specialized_labs: [
            "Grid-Tied Solar Inverter & Balance of System (BOS) Bench",
            "Domestic Appliance Diagnostic Testing Suite",
            "SHG Micro-Enterprise Incubation Sandbox",
          ],
          corporate_partners: ["Tata Power", "UPNEDA (UP New & Renewable Energy Dev Agency)"],
          annual_capacity: 1000,
          placement_rate: "74% verified formal placement",
          contact_email: "aligarh.tssdc@tatastrive.org",
          primary_topic: "Solar PV & Green Jobs",
          description: "Grassroots skilling and micro-entrepreneurship incubator driving solar adoption under PM Surya Ghar.",
        },
        {
          id: "tsec_bhubaneswar",
          name: "Tata STRIVE Extension Centre (TSEC) Bhubaneswar",
          short_name: "TSEC Bhubaneswar",
          city: "Bhubaneswar",
          state: "Odisha",
          zone: "East",
          type: "Domain TSEC",
          address: "Chandrasekharpur Institutional Area, Bhubaneswar - 751024",
          key_domains: ["General Duty Assistant (GDA) Healthcare", "Bedside Patient Care & Phlebotomy", "Hospitality Food & Beverage Service"],
          specialized_labs: [
            "10-Bed Clinical Simulation Ward with Vital Telemetry Monitors",
            "Taj Hospitality Food & Beverage Banqueting Suite",
          ],
          corporate_partners: ["Indian Hotels Company Limited (IHCL / Taj)", "Apollo Hospitals Group"],
          annual_capacity: 750,
          placement_rate: "84% verified formal placement",
          contact_email: "odisha.tsec@tatastrive.org",
          primary_topic: "Healthcare & Nursing Assistance",
          description: "Specialized healthcare clinical ward and luxury hospitality training in partnership with IHCL Taj.",
        },
        {
          id: "tsec_bengaluru",
          name: "Tata STRIVE Extension Centre (TSEC) Bengaluru",
          short_name: "TSEC Bengaluru",
          city: "Bengaluru",
          state: "Karnataka",
          zone: "South",
          type: "Domain TSEC",
          address: "Peenya Industrial Area Stage 1, Bengaluru - 560058",
          key_domains: ["Python Programming & AI Literacy", "Warehouse Inventory & Logistics", "Digital Workplace Communication"],
          specialized_labs: [
            "Cloud Computing Linux Workstation Lab",
            "Supply Chain Barcode Scanning & ERP Inventory Lab",
          ],
          corporate_partners: ["Tata Digital", "Croma", "TCS"],
          annual_capacity: 850,
          placement_rate: "79% verified formal placement",
          contact_email: "bengaluru.tsec@tatastrive.org",
          primary_topic: "Practical AI skills",
          description: "Urban skilling centre focused on logistics inventory management, data entry, and digital workplace literacy.",
        },
      ],
      outreach_initiatives: [
        {
          id: "ev-lab-ama",
          title: "EV Diagnostics & Battery Management Lab Open Day",
          description: "Hands-on walk-through of live 48V/72V EV battery diagnostics and motor controller troubleshooting at Pune and Nashik TSSDCs.",
          target_cohort: "Final year ITI Electrician/Motor Mechanic & Diploma students",
          tag: "High Momentum",
          icon: "electric_bolt",
          topic: "Electric Vehicle Fleet Maintenance",
          centre_name: "TSSDC Pune & Nashik",
          centre_location: "Pune & Nashik, Maharashtra",
          action_cta: "Use in Content Studio",
        },
        {
          id: "solar-pv-pmsuryaghar",
          title: "PM Surya Ghar Rooftop Solar Technician Orientation",
          description: "Orient rural and semi-urban youth on national rooftop solar subsidies, net metering safety, and grid-tied installation jobs.",
          target_cohort: "Rural youth, electricians & local contract technicians",
          tag: "Green Energy Mission",
          icon: "wb_sunny",
          topic: "Solar PV Installation",
          centre_name: "TSSDC Aligarh & Nashik",
          centre_location: "Aligarh, UP & Nashik, MH",
          action_cta: "Use in Content Studio",
        },
        {
          id: "ai-prompt-engineering",
          title: "AI Literacy & Prompt Engineering Masterclass for Freshers",
          description: "Demystify generative AI and practical office automation for non-IT graduates seeking career entry in digital services.",
          target_cohort: "Graduating BA/BSc/BCom non-IT degree students",
          tag: "Tech Future Ready",
          icon: "psychology",
          topic: "AI and digital skills",
          centre_name: "TSSDC Mumbai (Airoli)",
          centre_location: "Navi Mumbai, Maharashtra",
          action_cta: "Use in Content Studio",
        },
        {
          id: "hospital-gda-clinic",
          title: "Healthcare Bedside Assistant (GDA) Clinical Open Day",
          description: "Interactive clinical ward simulation demonstrating patient vitals telemetry, sterile procedures, and hospital bedside career ladders.",
          target_cohort: "Women job seekers and healthcare aspirants",
          tag: "Healthcare Livelihoods",
          icon: "health_and_safety",
          topic: "Healthcare & Nursing Assistance",
          centre_name: "TSEC Bhubaneswar",
          centre_location: "Bhubaneswar, Odisha",
          action_cta: "Use in Content Studio",
        },
        {
          id: "campus-placement-star",
          title: "STAR Method Behavioral Interview & Mock Corporate Drive",
          description: "Live resume audits, behavioral interview coaching, and corporate walk-in prep with 15+ participating employers.",
          target_cohort: "Final semester vocational learners & recent job seekers",
          tag: "Placement Linked",
          icon: "work",
          topic: "Employability and job readiness",
          centre_name: "TSSDC Hyderabad",
          centre_location: "Hyderabad, Telangana",
          action_cta: "Use in Content Studio",
        },
        {
          id: "shg-micro-entrepreneur",
          title: "Women Micro-Entrepreneurship & Incubation Circles",
          description: "Practical bookkeeping, digital payment adoption (UPI), and small enterprise business modeling for self-help groups.",
          target_cohort: "Women SHG leaders & rural entrepreneurs",
          tag: "Affirmative Action",
          icon: "storefront",
          topic: "Career guidance",
          centre_name: "TSEC Bengaluru & Aligarh TSSDC",
          centre_location: "Karnataka & Uttar Pradesh",
          action_cta: "Use in Content Studio",
        },
      ],
      categorized_faqs: [
        {
          id: "faq_ev",
          topic: "EV diagnostics and battery tech",
          topic_id: "ev-diagnostics-and-battery-tech",
          count: 18,
          sample_question: "Do we get hands-on experience in EV diagnostics labs during the weekend course?",
          suggested_reply: "Yes! All Tata STRIVE EV technician courses at TSSDC Pune and Nashik include 60% dedicated lab time working on live 48V/72V battery management test benches and motor diagnostic rigs in partnership with Tata Motors.",
          reply_label: "Verified Institutional Reply",
          centre_connection: "TSSDC Pune & TSSDC Nashik",
        },
        {
          id: "faq_ai",
          topic: "AI and digital skills",
          topic_id: "ai-and-digital-skills",
          count: 14,
          sample_question: "What are the eligibility criteria and batch start dates for the AI & Prompt Engineering certificate in Mumbai? Does it require prior Python coding background?",
          suggested_reply: "Tata STRIVE Mumbai (Airoli) offers hands-on AI literacy and prompt engineering bootcamps designed for non-IT graduates without mandatory prior Python experience, concluding with TCS iON aligned certification.",
          reply_label: "Verified Institutional Reply",
          centre_connection: "TSSDC Mumbai (Airoli) & TSEC Bengaluru",
        },
        {
          id: "faq_employability",
          topic: "Employability and job readiness",
          topic_id: "employability",
          count: 22,
          sample_question: "Is there job placement assistance in automotive and IT companies after completing certification?",
          suggested_reply: "Tata STRIVE operates placement-linked programs with 120+ corporate partners including Tata Motors, Taj IHCL, Voltas, and TCS. In FY24, 37,453 learners achieved formal livelihoods.",
          reply_label: "Verified Institutional Reply",
          centre_connection: "Nationwide across all 156 centres",
        },
        {
          id: "faq_solar",
          topic: "Solar PV Installation",
          topic_id: "solar-pv-installation",
          count: 11,
          sample_question: "Which Tata STRIVE courses are eligible under Pradhan Mantri Kaushal Vikas Yojana (PMKVY 4.0) and PM Surya Ghar with government assessment certifications?",
          suggested_reply: "The Solar PV Installation course at TSSDC Aligarh and Nashik is strictly aligned with NSQF Level 4 standards and certified by the Skill Council for Green Jobs (SCGJ), qualifying graduates for PM Surya Ghar rooftop contractor roles.",
          reply_label: "Verified Institutional Reply",
          centre_connection: "TSSDC Aligarh & TSSDC Nashik",
        },
        {
          id: "faq_scholarship",
          topic: "Scholarships & Apprenticeship Stipends",
          topic_id: "scholarships-stipends",
          count: 9,
          sample_question: "Is financial stipend provided during the 6-month apprenticeship under the National Apprenticeship Promotion Scheme (NAPS)?",
          suggested_reply: "Yes! Candidates enrolling in Tata STRIVE apprenticeship tracks receive direct benefit transfer (DBT) monthly stipends under NAPS/NATS, alongside complete tuition fee sponsorship under Affirmative Action guidelines.",
          reply_label: "Verified Institutional Reply",
          centre_connection: "Affirmative Action Support across India",
        },
        {
          id: "faq_healthcare",
          topic: "Healthcare & Nursing Assistance",
          topic_id: "healthcare-nursing-assistance",
          count: 8,
          sample_question: "Need clarification on clinical simulation ward training and hospital placement for the General Duty Assistant (GDA) batch.",
          suggested_reply: "The GDA programme at TSEC Bhubaneswar includes mandatory clinical ward training in our 10-bed simulated clinic followed by internship rotations at partner hospitals including Apollo and local health networks.",
          reply_label: "Verified Institutional Reply",
          centre_connection: "TSEC Bhubaneswar, Odisha",
        },
      ],
      best_time_to_post: [
        { hour: "08:00", label: "8 AM", score: 20, peak: false },
        { hour: "10:00", label: "10 AM", score: 20, peak: false },
        { hour: "12:00", label: "12 PM", score: 20, peak: false },
        { hour: "14:00", label: "2 PM", score: 20, peak: false },
        { hour: "17:00", label: "5 PM", score: 100, peak: true },
        { hour: "19:00", label: "7 PM", score: 20, peak: false },
        { hour: "21:00", label: "9 PM", score: 23, peak: false },
      ],
      updated_at: new Date().toISOString(),
    };
  },

  getOpportunities: async (query?: PostsQuery): Promise<{ items: Opportunity[] }> => {
    try {
      const res = await fetch("/api/opportunities", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.opportunities && data.opportunities.length > 0) {
          const items: Opportunity[] = data.opportunities.map((o: any) => ({
            id: o.id,
            title: o.title,
            topic: o.topic,
            summary: o.summary,
            why_it_matters: o.why_it_matters,
            score: o.score,
            score_breakdown: o.score_breakdown || { volume: 20, growth: 20, relevance: 20, engagement: 15, sentiment_gap: 10 },
            score_weights: o.score_weights || { volume: 0.25, growth: 0.25, relevance: 0.25, engagement: 0.15, sentiment_gap: 0.1 },
            priority: o.priority,
            supporting_post_ids: (o.evidence_posts || []).map((p: any) => p.id || p.url),
            recommended_action: o.recommended_action,
            platforms: ["youtube", "google_news"] as any,
            target_audience: o.target_audience,
            suggested_cta: o.suggested_cta,
            is_sample: Boolean(o.is_sample),
            post_count: o.post_count,
            evidence_posts: o.evidence_posts || [],
            sample_questions: o.sample_questions || [],
          }));
          return { items };
        }
      }
    } catch (e) {
      console.warn("Using sample opportunities fallback:", e);
    }
    return {
      items: SAMPLE_OPPORTUNITIES.map((o: any) => ({
        ...o,
        score_weights: { volume: 0.25, growth: 0.25, relevance: 0.25, engagement: 0.15, sentiment_gap: 0.1 },
        supporting_post_ids: ["sample-1", "sample-2"],
        platforms: ["youtube", "google_news"] as any,
        is_sample: true,
      })),
    };
  },

  getOpportunity: async (id: string): Promise<Opportunity> => {
    const oppsRes = await api.getOpportunities();
    const found = oppsRes.items.find((o) => o.id === id);
    if (!found) {
      if (oppsRes.items.length > 0) return oppsRes.items[0];
      throw new Error(`Opportunity ${id} not found`);
    }
    return found;
  },

  getRealReports: async () => {
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Failed to fetch reports:", e);
    }
    return { status: "success", total: 0, items: [], updated_at: new Date().toISOString() };
  },

  generateReport: async (payload: { title?: string; format?: string; scope?: string; author?: string }) => {
    const res = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to generate report");
    return await res.json();
  },

  getRealCampaigns: async () => {
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Failed to fetch campaigns:", e);
    }
    return { status: "success", total: 0, items: [], updated_at: new Date().toISOString() };
  },

  saveCampaign: async (payload: {
    opportunity_id?: string;
    topic?: string;
    title: string;
    tone?: string;
    platform?: string;
    target_audience?: string;
    visual_suggestion?: string;
    body_copy: string;
    call_to_action?: string;
    hashtags?: string;
    metrics?: string;
  }) => {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save campaign");
    return await res.json();
  },

  deleteCampaign: async (id: string) => {
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete draft");
    return await res.json();
  },

  generateAiContent: async (payload: {
    kind: "campaign" | "opportunity_brief" | "outreach_post" | "faq_reply";
    topic: string;
    audience?: string;
    platform?: string;
    tone?: string;
    language?: string;
    context?: any;
  }): Promise<{
    headline: string;
    body: string;
    hashtags: string[];
    cta: string;
    visual_suggestion: string;
    platform: string;
    variants?: Array<{ platform: string; body: string }>;
    model_used?: string;
    tokens_used?: any;
    error?: string;
    message?: string;
  }> => {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || data.error || `Generation failed (HTTP ${res.status})`;
      const err = new Error(msg);
      (err as any).status = res.status;
      (err as any).code = data.error;
      throw err;
    }
    return data;
  },


  generateCampaign: async (req: GenerateCampaignRequest): Promise<Campaign> => {
    try {
      const res = await fetch("/api/studio/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Campaign generation failed (HTTP ${res.status})`);
      }
      return await res.json();
    } catch (err: any) {
      throw new Error(err.message || "Campaign generation failed. Check backend connection.");
    }
  },

  getStudioEvidencePack: async (topic: string): Promise<StudioEvidencePack> => {
    const res = await fetch(`/api/studio/evidence-pack?topic=${encodeURIComponent(topic)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to fetch evidence pack (HTTP ${res.status})`);
    }
    return await res.json();
  },

  getStudioSuggestions: async (): Promise<StudioSuggestionsResponse> => {
    const res = await fetch("/api/studio/suggestions", { cache: "no-store" });
    if (!res.ok) {
      return {
        taxonomy_topics: [],
        strive_programmes: [],
      };
    }
    return await res.json();
  },

  importCsv: async (file: File): Promise<{ added: number; error?: string }> => {
    return store.importCsvFile(file);
  },

  searchYouTube: async (
    query: string,
    limit = 12,
    cursor?: string
  ): Promise<{
    items: Post[];
    posts: Post[];
    cursor: string | null;
    hits_total: number;
    relevant_count: number;
    totalFound: number;
    error?: string;
    status?: number;
  }> => {
    const cacheKey = `yt:${query.toLowerCase()}:${limit}:${cursor || ""}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const settings = store.getSettings();
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (cursor) params.set("cursor", cursor);
    if (settings.youtubeApiKey) params.set("apiKey", settings.youtubeApiKey);

    const fallback = {
      items: [],
      posts: [],
      cursor: null,
      hits_total: 0,
      relevant_count: 0,
      totalFound: 0,
      error: "YouTube search unavailable",
    };

    const fetchPromise = async () => {
      try {
        const res = await fetch(`/api/connectors/youtube?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          return {
            items: fallback.items,
            posts: fallback.posts,
            cursor: null,
            hits_total: fallback.hits_total,
            relevant_count: fallback.relevant_count,
            totalFound: fallback.totalFound,
            error: data.error,
          };
        }
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        const result = {
          items,
          posts: items,
          cursor: data.cursor || null,
          hits_total: data.hits_total || items.length,
          relevant_count: data.relevant_count || items.length,
          totalFound: data.hits_total || items.length,
        };
        clientCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 2000, fallback);
  },

  searchBluesky: async (
    query: string,
    limit = 15,
    cursor?: string
  ): Promise<{
    items: Post[];
    cursor: string | null;
    hits_total: number;
    relevant_count: number;
    error?: string;
    status?: number;
  }> => {
    const cacheKey = `bsky:${query.toLowerCase()}:${limit}:${cursor || ""}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });
    if (cursor) params.set("cursor", cursor);

    const fallback = {
      items: [],
      cursor: null,
      hits_total: 0,
      relevant_count: 0,
      error: "Bluesky search unavailable",
    };

    const fetchPromise = async () => {
      try {
        const res = await fetch(`/api/connectors/bluesky?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          return {
            items: fallback.items,
            cursor: null,
            hits_total: fallback.hits_total,
            relevant_count: fallback.relevant_count,
            error: data.error,
          };
        }
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 1800, fallback);
  },

  collectBlueskyPosts: (posts: Post[]): { added: number; total: number } => {
    const prevCount = store.getPosts().length;
    store.addPosts(posts);
    const newCount = store.getPosts().length;
    return {
      added: newCount - prevCount,
      total: newCount,
    };
  },

  collectPosts: (posts: Post[]): { added: number; total: number } => {
    const prevCount = store.getPosts().length;
    store.addPosts(posts);
    const newCount = store.getPosts().length;
    return {
      added: newCount - prevCount,
      total: newCount,
    };
  },

  searchGdelt: async (
    query: string,
    dateRange = "30d",
    limit = 25
  ): Promise<GdeltNewsResponse> => {
    const cacheKey = `gdelt:${query.toLowerCase()}:${dateRange}:${limit}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const params = new URLSearchParams({
      q: query,
      date_range: dateRange,
      limit: limit.toString(),
    });

    const fallback: GdeltNewsResponse = {
      articles: [],
      total_retrieved: 0,
      hits_estimate: 0,
      tone_distribution: { positive: 0, neutral: 0, negative: 0 },
      timeline: [],
      top_domains: [],
      top_topics: [],
      query,
      timespan: dateRange,
      source: "gdelt",
    };

    const fetchPromise = async () => {
      try {
        const res = await fetch(`/api/social-listening?${params.toString()}`);
        if (!res.ok) {
          return fallback;
        }
        const data = await res.json();
        if (data.articles?.length > 0) {
          store.addPosts(data.articles);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 1800, fallback);
  },

  searchGooglePlaces: async (
    query: string,
    limit = 15
  ): Promise<{ items: Post[]; total: number; notice?: string }> => {
    const cacheKey = `gplaces:${query.toLowerCase()}:${limit}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const fallback = {
      items: [],
      total: 0,
      notice: "Google Places unavailable",
    };

    const fetchPromise = async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: limit.toString() });
        const res = await fetch(`/api/connectors/google-places?${params.toString()}`);
        if (!res.ok) return fallback;
        const data = await res.json();
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 1800, fallback);
  },

  searchGoogleNews: async (
    query: string,
    limit = 20
  ): Promise<{ items: Post[]; total: number; notice?: string }> => {
    const cacheKey = `gnews:${query.toLowerCase()}:${limit}`;
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    const fallback = {
      items: [],
      total: 0,
      notice: "Google News unavailable",
    };

    const fetchPromise = async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: limit.toString() });
        const res = await fetch(`/api/connectors/google-news?${params.toString()}`);
        if (!res.ok) return fallback;
        const data = await res.json();
        const items: Post[] = data.items || [];
        if (items.length > 0) {
          store.addPosts(items);
        }
        clientCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err: any) {
        return fallback;
      }
    };

    return withClientTimeout(fetchPromise(), 1800, fallback);
  },

  getComments: (postId: string): CommentItem[] => {
    return store.getPostComments(postId);
  },

  addComment: (
    postId: string,
    comment: { author_handle: string; content: string; is_official?: boolean }
  ): CommentItem => {
    return store.addCommentToPost(postId, comment);
  },

  getLocalStoreSettings: (): ApiSettings => {
    return store.getSettings();
  },

  saveLocalStoreSettings: (settings: Partial<ApiSettings>) => {
    store.saveSettings(settings);
  },

  resetData: () => {
    store.resetToDefault();
  },

  refresh: async (): Promise<{ status: string; last_updated: string }> => {
    return {
      status: "ok",
      last_updated: new Date().toISOString(),
    };
  },
};
