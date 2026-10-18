import { NextRequest, NextResponse } from "next/server";
import { Campaign, GenerateCampaignRequest, Platform, CampaignMetric, CampaignTone } from "@/types";

export const runtime = "nodejs";

const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  process.env.XAI_API_KEY ||
  "";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateCampaignRequest & { opportunity_title?: string; why_it_matters?: string } = await req.json();
    const { opportunity_id, tone = "inspiring", platform = "youtube", opportunity_title, why_it_matters } = body;

    if (!opportunity_id) {
      return NextResponse.json(
        { error: "opportunity_id is required." },
        { status: 400 }
      );
    }

    const titleContext = opportunity_title || opportunity_id.replace(/_/g, " ");
    const rationaleContext = why_it_matters || "High-volume demand from youth and freshers seeking skilling and job placement.";

    // If Groq or xAI API key is present, generate campaign with LLM
    if (GROQ_API_KEY) {
      const isGroq = GROQ_API_KEY.startsWith("gsk_");
      const baseUrl = isGroq ? "https://api.groq.com/openai/v1" : "https://api.x.ai/v1";
      const model = isGroq ? "llama-3.3-70b-versatile" : "grok-2-latest";

      const systemPrompt = `You are the Head of Social Media & Digital Outreach for Tata STRIVE (skill development, youth employability, and vocational empowerment).
Generate a targeted Conversation-to-Campaign plan for Tata STRIVE addressing a prioritized social opportunity.
Tone: ${tone}. Primary Channel: ${platform}.
Respond STRICTLY with valid JSON. Do not include markdown codeblocks or text outside the JSON.

JSON schema:
{
  "content_ideas": [
    {
      "format": "Short-Form Video / Carousel / Infographic / Case Study",
      "title": "Creative Content Title",
      "description": "Engaging description of the hook, angle, and takeaway",
      "target_audience": "e.g. ITI students, B.Com freshers, rural youth"
    }
  ],
  "captions": [
    { "platform": "youtube", "text": "Platform-ready caption with relevant hashtags" },
    { "platform": "bluesky", "text": "Platform-ready caption under 300 characters" },
    { "platform": "google_news", "text": "PR / Press wire announcement excerpt" }
  ],
  "key_messages": [
    "Pillar message 1",
    "Pillar message 2",
    "Pillar message 3"
  ],
  "call_to_action": "Clear, measurable CTA text",
  "success_metrics": [
    { "metric": "shares", "target": "500+ organic shares" },
    { "metric": "saves", "target": "1,200+ resource saves" },
    { "metric": "comments", "target": "350+ student inquiries answered" },
    { "metric": "clicks", "target": "2,500+ course portal visits" }
  ]
}`;

      const userPrompt = `Opportunity: ${titleContext}
Why it matters to Tata STRIVE: ${rationaleContext}
Tone: ${tone}
Generate 3 distinct content ideas, platform-tailored captions, 3 key messaging pillars, 1 action-oriented CTA, and 4 measurable success metrics.`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const aiRes = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1200,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const raw = aiData.choices?.[0]?.message?.content || "{}";
          const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
          const parsed = JSON.parse(clean);

          const campaign: Campaign = {
            opportunity_id,
            generated_at: new Date().toISOString(),
            content_ideas: parsed.content_ideas || [],
            captions: parsed.captions || [],
            key_messages: parsed.key_messages || [],
            call_to_action: parsed.call_to_action || "Enroll in free Tata STRIVE certification courses at strive.tatatrusts.org",
            success_metrics: (parsed.success_metrics || []).map((m: any) => ({
              metric: (["shares", "saves", "comments", "clicks"].includes(m.metric) ? m.metric : "clicks") as CampaignMetric,
              target: String(m.target || "1,000+"),
            })),
          };

          return NextResponse.json(campaign);
        }
      } catch (aiErr: any) {
        console.warn("AI generation failed, proceeding to deterministic synthesizer:", aiErr.message);
      }
    }

    // Deterministic rule-based synthesizer when external LLM is not configured
    const campaign: Campaign = {
      opportunity_id,
      generated_at: new Date().toISOString(),
      content_ideas: [
        {
          format: "Short-Form Reel / Video",
          title: `Step-by-Step Guide: ${titleContext}`,
          description: `Direct response breaking down student questions into 3 practical actions for career readiness.`,
          target_audience: "Fresh graduates, ITI/Polytechnic diploma holders",
        },
        {
          format: "Visual Carousel & Infographic",
          title: "From Classroom to Placement: The Skill Gap Checklist",
          description: "High-save reference chart showing essential tools, certification requirements, and hiring trends.",
          target_audience: "Job-seekers and career switchers",
        },
        {
          format: "Alumni Spotlight Story",
          title: "Real Stories, Real Careers: Tata STRIVE Graduate Journey",
          description: "Student interview showcasing salary jump and workplace confidence after completing certification.",
          target_audience: "Prospective learners and parents",
        },
      ],
      captions: [
        {
          platform: "youtube",
          text: `Are you struggling with ${titleContext.toLowerCase()}? Tata STRIVE provides free industry-certified training with placement support across India. Watch the complete roadmap! #TataSTRIVE #SkillIndia #Employability`,
        },
        {
          platform: "bluesky",
          text: `Freshers often get stuck on ${titleContext.toLowerCase()}. Here are 3 practical steps that recruiters actually look for in 2026. Free counseling at Tata STRIVE centers. #SkillingIndia`,
        },
        {
          platform: "google_news",
          text: `Tata STRIVE launches focused vocational cohort addressing emerging demand in ${titleContext.toLowerCase()}, offering hands-on workshops and placement assistance.`,
        },
      ],
      key_messages: [
        `Bridge practical skills beyond classroom theory with Tata STRIVE industry partners.`,
        `Zero-cost vocational certification accessible across district centers in India.`,
        `Direct linkage to campus placement drives with vetted hiring employers.`,
      ],
      call_to_action: "Join the upcoming Tata STRIVE cohort — register free at strive.tatatrusts.org",
      success_metrics: [
        { metric: "shares", target: "450+ verified shares" },
        { metric: "saves", target: "800+ career checklist saves" },
        { metric: "comments", target: "200+ student guidance answers" },
        { metric: "clicks", target: "1,500+ portal registrations" },
      ],
    };

    return NextResponse.json(campaign);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate campaign." },
      { status: 500 }
    );
  }
}
