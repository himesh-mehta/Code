import re
from typing import Dict, List, Tuple, Optional, Any

# Standardized deterministic topic categories for Tata STRIVE (Core + Emerging Early-Signals)
TOPIC_CATEGORIES = [
    "AI and digital skills",
    "EV and battery",
    "Solar and green energy",
    "Employability and job readiness",
    "Vocational training",
    "Internships and apprenticeships",
    "Scholarships and stipends",
    "Entrepreneurship and self-employment",
    "Youth education and counseling",
    "Employer skill requirements",
    "Industrial IoT and PLC",
    "Green hydrogen",
    "Healthcare and tele-health",
    "Drones",
]

# Taxonomy dictionary with weighted keywords and phrases
TAXONOMY_RULES: Dict[str, Dict[str, Any]] = {
    "AI and digital skills": {
        "slug": "ai-and-digital-skills",
        "category": "Digital Skills",
        "description": "Artificial intelligence, prompt engineering, data analytics, and digital office productivity.",
        "primary": [
            "artificial intelligence", "generative ai", "genai", "prompt engineering",
            "chatgpt", "machine learning", "deep learning", "python coding",
            "data analytics", "data science", "automation tools", "cybersecurity",
            "digital literacy", "cloud computing", "llm", "copilot"
        ],
        "secondary": [
            "ai tools", "coding", "software", "tech skills", "digital skills",
            "algorithms", "prompt", "nlp", "computer vision", "tech education"
        ]
    },
    "EV diagnostics and battery tech": {
        "slug": "ev-diagnostics",
        "category": "Green Automotive",
        "description": "Electric vehicle maintenance, battery management systems, diagnostic test benches, and charging infra.",
        "primary": [
            "ev diagnostics", "electric vehicle", "ev technician", "battery tech",
            "battery management system", "bms", "high voltage safety", "ev battery",
            "charging station", "electric vehicle training", "ev maintenance", "hybrid vehicle"
        ],
        "secondary": [
            "ev", "electric scooter", "electric car", "chakan", "automotive hub",
            "lithium ion", "diagnostic bench", "powertrain", "ev retrofit"
        ]
    },
    "Solar PV installation": {
        "slug": "solar-pv",
        "category": "Renewable Energy",
        "description": "Rooftop solar PV installation, micro-grid maintenance, solar inverter setup, and renewable entrepreneurship.",
        "primary": [
            "solar pv", "solar installation", "solar technician", "rooftop solar",
            "solar microgrid", "photovoltaic", "solar inverter", "grid tied inverter",
            "surya ghar", "pm surya", "solar training", "solar entrepreneurship"
        ],
        "secondary": [
            "solar panel", "clean energy", "renewable energy", "net metering",
            "solar subsidy", "pv installer", "solar pumping"
        ]
    },
    "Employability and job readiness": {
        "slug": "employability",
        "category": "Core Employability",
        "description": "Interview preparation, resume building, workplace communication, mock HR discussions, and soft skills.",
        "primary": [
            "employability", "job readiness", "interview preparation", "mock interview",
            "behavioral interview", "hr round", "resume building", "cv format",
            "group discussion", "workplace communication", "soft skills",
            "professional grooming", "campus placement"
        ],
        "secondary": [
            "interview", "resume", "fresher jobs", "salary negotiation",
            "career guidance", "aptitude test", "communication skills",
            "english fluency", "personality development", "workplace culture"
        ]
    },
    "Vocational training": {
        "slug": "vocational-training",
        "category": "Vocational Excellence",
        "description": "Trades training, ITI alignment, polytechnic practical labs, welding, electrical, HVAC, and TVET certifications.",
        "primary": [
            "vocational training", "tvet", "iti", "polytechnic", "vocational skills",
            "automotive training", "electrical wiring", "welding", "plumbing technician",
            "hvac", "hospitality training", "retail sales technician", "strive center"
        ],
        "secondary": [
            "trade course", "hands on training", "technician", "mechanic",
            "craftsman", "apparel manufacturing", "carpentry", "skill center",
            "practical training", "short term certification"
        ]
    },
    "Internships and placements": {
        "slug": "internships-and-placements",
        "category": "Workforce Transition",
        "description": "Apprenticeships, NAPS/NATS government schemes, on-the-job training, stipends, and hiring fairs.",
        "primary": [
            "apprenticeship", "internship", "stipend", "naps", "nats",
            "on the job training", "ojt", "dual certification", "placement drive",
            "job fair", "rozgar mela", "hiring drive"
        ],
        "secondary": [
            "apprentice", "intern", "campus drive", "off campus hiring",
            "walk in interview", "company trainee", "summer internship"
        ]
    },
    "Entrepreneurship and self-employment": {
        "slug": "entrepreneurship",
        "category": "Enterprise & Livelihood",
        "description": "Micro-enterprise creation, Mudra loan eligibility, business plans, self-employment, and rural startups.",
        "primary": [
            "entrepreneurship", "micro enterprise", "self employment", "mudra loan",
            "pmegp", "startup india", "small business setup", "shg enterprise",
            "women entrepreneur", "business model", "seed capital"
        ],
        "secondary": [
            "startup", "founder", "freelancing", "own business", "kirana tech",
            "agri business", "local entrepreneur", "vendor setup", "micro credit"
        ]
    },
    "Youth education and counseling": {
        "slug": "youth-education",
        "category": "Youth Development",
        "description": "Career counseling, NEP 2020 vocational integration, first-generation learners, and scholarship guidance.",
        "primary": [
            "youth development", "higher education", "nep 2020", "skill curriculum",
            "tier 2 youth", "rural youth", "first generation learners",
            "career counseling", "school dropout skilling", "counseling deficit"
        ],
        "secondary": [
            "undergraduate", "b.com fresher", "arts graduate", "college student",
            "career roadmap", "mentorship program", "guidance", "scholarship"
        ]
    },
    "Employer skill requirements": {
        "slug": "employer-skill-requirements",
        "category": "Industry Demand",
        "description": "Industry demand trends, skills shortage reports, curriculum industry alignment, and future of work.",
        "primary": [
            "industry demand", "skill gap", "employer expectations", "industry readiness",
            "talent shortage", "curriculum mismatch", "industry academia partnership",
            "future of work", "nasscom report", "wef skills"
        ],
        "secondary": [
            "job market", "hiring trends", "corporate demand", "industry standards",
            "certification requirement", "entry level expectations"
        ]
    },
    "Industrial IoT and PLC automation": {
        "slug": "industrial-iot-plc",
        "category": "Advanced Manufacturing",
        "description": "Programmable logic controllers, industrial automation, SCADA, sensor interfacing, and smart factory tech.",
        "primary": [
            "industrial iot", "plc programming", "industrial automation", "scada",
            "industry 4 0", "smart factory", "sensor integration", "mechatronics",
            "siemens plc", "allen bradley"
        ],
        "secondary": [
            "automation", "plc", "iiot", "robotics technician", "controllers",
            "factory automation"
        ]
    },
    "Green hydrogen plant operations": {
        "slug": "green-hydrogen",
        "category": "Green Energy Frontier",
        "description": "Electrolyzer operations, hydrogen fuel safety, green ammonia production, and clean tech plant logistics.",
        "primary": [
            "green hydrogen", "electrolyzer", "hydrogen plant", "clean fuel technician",
            "hydrogen safety", "national green hydrogen mission", "fuel cell technology"
        ],
        "secondary": [
            "hydrogen", "clean tech", "zero emission energy", "electrolysis", "green ammonia"
        ]
    },
    "Healthcare GDA and tele-health": {
        "slug": "tele-health-gda",
        "category": "Healthcare Services",
        "description": "General duty assistant, patient monitoring, tele-health diagnostics, geriatric care, and medical nursing support.",
        "primary": [
            "general duty assistant", "gda technician", "tele health", "patient care assistant",
            "home healthcare", "geriatric care", "nursing aide", "medical diagnostic assistant"
        ],
        "secondary": [
            "healthcare skilling", "nursing", "hospital assistant", "phlebotomy", "telemedicine"
        ]
    },
    "Drone assembly and maintenance": {
        "slug": "drone-technology",
        "category": "Aviation & Agri-Tech",
        "description": "Kisan drone pilots, UAV assembly, avionics calibration, payload maintenance, and DGCA certified drone pilot courses.",
        "primary": [
            "drone assembly", "drone pilot", "kisan drone", "uav maintenance",
            "dgca certification", "drone technician", "drone repair", "agricultural drone"
        ],
        "secondary": [
            "drone", "uav", "quadcopter", "fpv", "drone flight", "payload calibration"
        ]
    },
    "Scholarships and stipends": {
        "slug": "scholarships-and-stipends",
        "category": "Financial Support & Equity",
        "description": "Scholarships, stipend schemes, fellowship allowances, and financial assistance for vocational trainees.",
        "primary": [
            "scholarship", "stipend", "tata trusts scholarship", "financial aid",
            "fellowship allowance", "merit scholarship", "fee waiver", "free training",
            "stipendiary trainee", "dbt stipend", "student scholarship"
        ],
        "secondary": [
            "stipend scheme", "free course", "sponsored training", "allowance",
            "grant", "subsidized course", "tuition support"
        ]
    },
    "EV and battery": {
        "slug": "ev-and-battery",
        "category": "Green Automotive",
        "description": "Electric vehicle maintenance, battery management systems, diagnostic test benches, and charging infra.",
        "primary": [
            "ev diagnostics", "electric vehicle", "ev technician", "battery tech",
            "battery management system", "bms", "high voltage safety", "ev battery",
            "charging station", "electric vehicle training", "ev maintenance", "hybrid vehicle"
        ],
        "secondary": [
            "ev", "electric scooter", "electric car", "chakan", "automotive hub",
            "lithium ion", "diagnostic bench", "powertrain", "ev retrofit"
        ]
    },
    "Solar and green energy": {
        "slug": "solar-and-green-energy",
        "category": "Renewable Energy",
        "description": "Rooftop solar PV installation, micro-grid maintenance, solar inverter setup, and renewable entrepreneurship.",
        "primary": [
            "solar pv", "solar installation", "solar technician", "rooftop solar",
            "solar microgrid", "photovoltaic", "solar inverter", "grid tied inverter",
            "surya ghar", "pm surya", "solar training", "solar entrepreneurship"
        ],
        "secondary": [
            "solar panel", "clean energy", "renewable energy", "net metering",
            "solar subsidy", "pv installer", "solar pumping"
        ]
    },
    "Internships and apprenticeships": {
        "slug": "internships-and-apprenticeships",
        "category": "Workforce Transition",
        "description": "Apprenticeships, NAPS/NATS government schemes, on-the-job training, stipends, and hiring fairs.",
        "primary": [
            "apprenticeship", "internship", "stipend", "naps", "nats",
            "on the job training", "ojt", "dual certification", "placement drive",
            "job fair", "rozgar mela", "hiring drive"
        ],
        "secondary": [
            "apprentice", "intern", "campus drive", "off campus hiring",
            "walk in interview", "company trainee", "summer internship"
        ]
    },
    "Industrial IoT and PLC": {
        "slug": "industrial-iot-plc",
        "category": "Advanced Manufacturing",
        "description": "Programmable logic controllers, industrial automation, SCADA, sensor interfacing, and smart factory tech.",
        "primary": [
            "industrial iot", "plc programming", "industrial automation", "scada",
            "industry 4 0", "smart factory", "sensor integration", "mechatronics",
            "siemens plc", "allen bradley"
        ],
        "secondary": [
            "automation", "plc", "iiot", "robotics technician", "controllers",
            "factory automation"
        ]
    },
    "Green hydrogen": {
        "slug": "green-hydrogen",
        "category": "Green Energy Frontier",
        "description": "Electrolyzer operations, hydrogen fuel safety, green ammonia production, and clean tech plant logistics.",
        "primary": [
            "green hydrogen", "electrolyzer", "hydrogen plant", "clean fuel technician",
            "hydrogen safety", "national green hydrogen mission", "fuel cell technology"
        ],
        "secondary": [
            "hydrogen", "clean tech", "zero emission energy", "electrolysis", "green ammonia"
        ]
    },
    "Healthcare and tele-health": {
        "slug": "healthcare-and-tele-health",
        "category": "Healthcare Services",
        "description": "General duty assistant, patient monitoring, tele-health diagnostics, geriatric care, and medical nursing support.",
        "primary": [
            "general duty assistant", "gda technician", "tele health", "patient care assistant",
            "home healthcare", "geriatric care", "nursing aide", "medical diagnostic assistant"
        ],
        "secondary": [
            "healthcare skilling", "nursing", "hospital assistant", "phlebotomy", "telemedicine"
        ]
    },
    "Drones": {
        "slug": "drones",
        "category": "Aviation & Agri-Tech",
        "description": "Kisan drone pilots, UAV assembly, avionics calibration, payload maintenance, and DGCA certified drone pilot courses.",
        "primary": [
            "drone assembly", "drone pilot", "kisan drone", "uav maintenance",
            "dgca certification", "drone technician", "drone repair", "agricultural drone"
        ],
        "secondary": [
            "drone", "uav", "quadcopter", "fpv", "drone flight", "payload calibration"
        ]
    }
}

TOPIC_SLUGS: Dict[str, str] = {
    rule["slug"]: topic for topic, rule in TAXONOMY_RULES.items()
}

# Aliases mapping legacy or alternate labels to canonical topics
TOPIC_ALIASES: Dict[str, str] = {
    "ev diagnostics and battery tech": "EV and battery",
    "ev-diagnostics": "EV and battery",
    "solar pv installation": "Solar and green energy",
    "solar-pv": "Solar and green energy",
    "internships and placements": "Internships and apprenticeships",
    "internships-and-placements": "Internships and apprenticeships",
    "industrial iot and plc automation": "Industrial IoT and PLC",
    "green hydrogen plant operations": "Green hydrogen",
    "healthcare gda and tele-health": "Healthcare and tele-health",
    "tele-health-gda": "Healthcare and tele-health",
    "drone assembly and maintenance": "Drones",
    "drone-technology": "Drones",
    "entrepreneurship": "Entrepreneurship and self-employment",
    "youth education": "Youth education and counseling",
}


def clean_text(text: str) -> str:
    """Normalize text by lowercasing, stripping URLs, punctuation, and redundant whitespace."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"[^\w\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def classify_text_to_topic(title: str, body: str = "") -> Tuple[str, str, float]:
    """
    Deterministic rule-based classification against standard Tata STRIVE taxonomy.
    Returns (topic_name, topic_slug, confidence_score 0.0-1.0).
    """
    full_text = clean_text(f"{title} {body}")
    if not full_text:
        return ("Employability and job readiness", "employability", 0.3)

    best_topic = "Employability and job readiness"
    best_slug = "employability"
    best_score = 0.0

    for topic, rule in TAXONOMY_RULES.items():
        score = 0.0
        # Primary keywords carry weight 3.0
        for kw in rule["primary"]:
            if re.search(r"\b" + re.escape(kw) + r"\b", full_text):
                score += 3.0

        # Secondary keywords carry weight 1.0
        for kw in rule["secondary"]:
            if re.search(r"\b" + re.escape(kw) + r"\b", full_text):
                score += 1.0

        if score > best_score:
            best_score = score
            best_topic = topic
            best_slug = rule["slug"]

    if best_score == 0.0:
        return ("Employability and job readiness", "employability", 0.35)

    confidence = min(0.98, round(0.5 + (best_score / 15.0) * 0.45, 2))
    return (best_topic, best_slug, confidence)

def topic_to_slug(topic: str) -> str:
    """Convert a canonical topic name to a stable URL slug."""
    for t_name, rule in TAXONOMY_RULES.items():
        if t_name.lower() == topic.lower():
            return rule["slug"]
    cleaned = topic.lower().replace("&", "and").replace(" ", "-").replace("/", "-")
    return re.sub(r"[^\w-]", "", cleaned).strip("-")

def slug_to_topic(slug_or_name: str) -> Optional[str]:
    """Resolve a URL slug or case-insensitive name to canonical topic name."""
    if not slug_or_name:
        return None
    clean_slug = slug_or_name.lower().strip()
    if clean_slug in TOPIC_ALIASES:
        return TOPIC_ALIASES[clean_slug]
    if clean_slug in TOPIC_SLUGS:
        return TOPIC_SLUGS[clean_slug]
    for t in TOPIC_CATEGORIES:
        if t.lower() == slug_or_name.lower() or topic_to_slug(t) == clean_slug:
            return t
    return None
