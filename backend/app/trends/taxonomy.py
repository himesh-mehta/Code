import re
from typing import Dict, List, Tuple, Optional

# Standardized deterministic topic categories for Tata STRIVE
TOPIC_CATEGORIES = [
    "AI and digital skills",
    "Vocational training",
    "Employability and job readiness",
    "Internships and placements",
    "Entrepreneurship",
    "Youth education",
    "Employer skill requirements",
]

# Taxonomy dictionary with weighted keywords and phrases
TAXONOMY_RULES: Dict[str, Dict[str, List[str]]] = {
    "AI and digital skills": {
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
    "Vocational training": {
        "primary": [
            "vocational training", "tvet", "iti", "polytechnic", "solar pv",
            "electric vehicle technician", "ev technician", "automotive training",
            "electrical wiring", "welding", "plumbing technician", "hvac",
            "hospitality training", "retail sales technician", "strive center"
        ],
        "secondary": [
            "trade course", "hands on training", "technician", "mechanic",
            "craftsman", "apparel manufacturing", "carpentry", "skill center",
            "practical training", "short term certification"
        ]
    },
    "Employability and job readiness": {
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
    "Internships and placements": {
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
    "Entrepreneurship": {
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
    "Youth education": {
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
        "primary": [
            "industry demand", "skill gap", "employer expectations", "industry readiness",
            "talent shortage", "curriculum mismatch", "industry academia partnership",
            "future of work", "nasscom report", "wef skills"
        ],
        "secondary": [
            "job market", "hiring trends", "corporate demand", "industry standards",
            "certification requirement", "entry level expectations"
        ]
    }
}

def clean_text(text: str) -> str:
    """Normalize text by lowercasing, stripping punctuation and redundant spaces."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"[^\w\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def classify_text_to_topic(title: str, body: str = "") -> Tuple[str, float]:
    """
    Deterministic rule-based classification against standard Tata STRIVE taxonomy.
    Returns (predicted_topic, confidence_score 0.0-1.0).
    """
    full_text = clean_text(f"{title} {body}")
    if not full_text:
        return ("Employability and job readiness", 0.3)

    best_topic = "Employability and job readiness"
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

    if best_score == 0.0:
        # Fallback to general employability
        return ("Employability and job readiness", 0.4)

    confidence = min(0.98, round(0.5 + (best_score / 15.0) * 0.45, 2))
    return (best_topic, confidence)
