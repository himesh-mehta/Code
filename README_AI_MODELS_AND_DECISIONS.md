# Social Pulse Intelligence — AI Models & Decision Calculations Engine

**Target Organization:** Tata STRIVE (Skilling, Employability & Youth Development)  
**Document Type:** AI/ML Specification & Algorithmic Decision Engine README  
**Version:** 2.0 (Production Verified)  
**Last Updated:** October 2026  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [What the AI/ML Models are Made From](#2-what-the-aiml-models-are-made-from)
   - [2.1 CardiffNLP RoBERTa Sentiment Model](#21-cardiffnlp-roberta-sentiment-model)
   - [2.2 Holt-Winters Exponential Triple Smoothing (ETS) Forecaster](#22-holt-winters-exponential-triple-smoothing-ets-forecaster)
   - [2.3 Groq LLaMA-3.3-70B-Versatile & LLaMA-3.1-8B-Instant](#23-groq-llama-33-70b-versatile--llama-31-8b-instant)
   - [2.4 Rule-Based & Semantic 13-Topic Taxonomy Engine](#24-rule-based--semantic-13-topic-taxonomy-engine)
3. [How Decisions and Scores are Calculated](#3-how-decisions-and-scores-are-calculated)
   - [3.1 The 5-Factor Opportunity Priority Scoring Formula](#31-the-5-factor-opportunity-priority-scoring-formula)
   - [3.2 Component Normalization & Scaling Mathematics](#32-component-normalization--scaling-mathematics)
   - [3.3 Priority Tiers and Primary Score Drivers](#33-priority-tiers-and-primary-score-drivers)
   - [3.4 Opportunity Map 2D Quadrant Calculation](#34-opportunity-map-2d-quadrant-calculation)
   - [3.5 Audience Best-Time-To-Post Calculation (IST Conversion)](#35-audience-best-time-to-post-calculation-ist-conversion)
4. [Hallucination Prevention & Guardrail Verification](#4-hallucination-prevention--guardrail-verification)
5. [Summary Architecture Flow](#5-summary-architecture-flow)

---

## 1. Executive Summary

Social Pulse Intelligence operates on a **hybrid intelligence architecture**:
1. **Deterministic Statistical & Mathematical Engines**: Scores, rankings, quadrant dividers, and historical aggregations are computed strictly via deterministic code formulas in Python—never by an unconstrained LLM.
2. **Specialized Machine Learning Models**: Sentiment analysis uses a dedicated transformer neural network (`cardiffnlp/twitter-roberta-base-sentiment-latest`), and trajectory projection uses statistical time-series forecasting (`Holt-Winters ETS`).
3. **Grounded Generative AI**: Groq LLaMA-3.3-70B synthesizes natural-language campaign collateral and conversational answers, but is strictly constrained by server-side numeric validation against the database payload.

---

## 2. What the AI/ML Models are Made From

### 2.1 CardiffNLP RoBERTa Sentiment Model

| Property | Specification |
| :--- | :--- |
| **Model Identifier** | `cardiffnlp/twitter-roberta-base-sentiment-latest` |
| **Base Architecture** | RoBERTa (Robustly Optimized BERT Approach, Liu et al.) |
| **Training Dataset** | Pre-trained on ~124M tweets (Jan 2018 – Dec 2021) and fine-tuned on the TweetEval benchmark |
| **Parameter Count** | ~125 Million parameters |
| **Layers & Hidden Dim** | 12 transformer encoder layers, 768 hidden dimensions, 12 attention heads |
| **Vocabulary & Tokenizer**| Byte-Pair Encoding (BPE) with 50,265 tokens; max sequence length of 512 tokens |
| **Execution Environment**| Local PyTorch pipeline running inside FastAPI (`backend/app/main.py` & `backend/sentiment_analyzer.py`) |

#### How It Operates
1. Ingests raw text from YouTube comments, news summaries, or student feedback.
2. Truncates text to the first 512 tokens.
3. Passes input through the 12-layer bidirectional transformer encoder to generate contextual token representations.
4. The `[CLS]` token representation passes through a classification head with a Softmax activation, yielding three distinct probabilities:
   $$\text{Probabilities} = \text{Softmax}(W \cdot h_{\text{[CLS]}} + b) = [P(\text{negative}), P(\text{neutral}), P(\text{positive})]$$
5. The class with the highest probability is assigned, and its softmax score is rounded to 3 decimal places as the `confidence` metric.

---

### 2.2 Holt-Winters Exponential Triple Smoothing (ETS) Forecaster

| Property | Specification |
| :--- | :--- |
| **Library & Implementation** | `statsmodels.tsa.holtwinters.ExponentialSmoothing` (`backend/app/trends/forecasting.py`) |
| **Trend Component** | Additive trend ($\beta$ smoothing parameter) |
| **Seasonal Component** | Additive seasonality with weekly period ($m = 7$ days, $\gamma$ parameter) when history $\ge 14$ days |
| **Initialization Method** | Estimated via statsmodels L-BFGS-B optimizer |
| **Strict Guardrail** | **Minimum 21 genuine calendar days required**. If $< 21$ real days exist, the model outputs `status: "building_history"` and refuses to generate speculative curves |

#### Mathematical Formulation
The level ($l_t$), trend ($b_t$), and seasonal ($s_t$) updates follow:
$$\hat{y}_{t+h\mid t} = l_t + h b_t + s_{t+h-m(k+1)}$$
$$l_t = \alpha(y_t - s_{t-m}) + (1-\alpha)(l_{t-1} + b_{t-1})$$
$$b_t = \beta(l_t - l_{t-1}) + (1-\beta)b_{t-1}$$
$$s_t = \gamma(y_t - l_{t-1} - b_{t-1}) + (1-\gamma)s_{t-m}$$

#### Backtesting & Model Selection
The engine performs chronological train/test backtesting:
- **Baseline Model**: Seasonal-Naive with Drift:
  $$\hat{y}_{t+k} = y_{t-7+(k \bmod 7)} + (k+1) \times \frac{y_t - y_0}{t}$$
- **Validation Metrics**: Evaluated on Symmetric Mean Absolute Percentage Error (sMAPE), Mean Absolute Error (MAE), and Root Mean Squared Error (RMSE):
  $$\text{sMAPE} = \frac{100\%}{n}\sum_{t=1}^n \frac{|y_t - \hat{y}_t|}{(|y_t| + |\hat{y}_t|) / 2}$$
- If ETS fitting fails or achieves worse error than the drift baseline ($\text{MAE}_{\text{ETS}} > 1.25 \times \text{MAE}_{\text{baseline}}$), the system automatically selects the robust baseline.

---

### 2.3 Groq LLaMA-3.3-70B-Versatile & LLaMA-3.1-8B-Instant

| Property | Specification |
| :--- | :--- |
| **Provider** | Groq Cloud LPU (Language Processing Unit) |
| **Primary Model** | `llama-3.3-70b-versatile` (Meta LLaMA 3.3, 70 Billion parameters) |
| **Fast Fallback Model** | `llama-3.1-8b-instant` (8 Billion parameters) |
| **Inference Latency** | $< 1.5$ seconds for full campaign generation |
| **Temperature / Top-P** | Temperature = 0.2 (low variance for factual precision), Top-P = 0.9 |
| **Roles in System** | 1. AI Campaign Studio copy (LinkedIn, Instagram, WhatsApp)<br/>2. Pulse AI Assistant conversational intelligence<br/>3. Grounded one-line opportunity justifications ("Why it matters to Tata STRIVE") |

---

### 2.4 Rule-Based & Semantic 13-Topic Taxonomy Engine

The system classifies every post into one of 13 canonical skilling domains defined in [backend/app/trends/taxonomy.py](file:///c:/SEM/sem-4/mini_project/college/Code/backend/app/trends/taxonomy.py):

| Topic ID | Topic Name | Category | Primary Match Keywords |
| :--- | :--- | :--- | :--- |
| `ev_tech` | EV diagnostics and battery tech | Clean Mobility | `ev`, `electric vehicle`, `bms`, `battery`, `charging station`, `high voltage` |
| `solar_pv` | Solar PV installation | Renewable Energy | `solar`, `pm surya ghar`, `rooftop solar`, `inverter`, `photovoltaic`, `grid` |
| `ai_digital` | AI and digital skills | Digital Workplace | `ai`, `artificial intelligence`, `prompting`, `chatgpt`, `python`, `data analytics` |
| `job_readiness` | Employability and job readiness | Core Employability | `resume`, `interview`, `placement`, `fresher job`, `soft skills`, `ats` |
| `drone_tech` | Drone pilot training | Emerging Tech | `drone`, `dgca`, `uav`, `remote pilot`, `drone mapping` |
| `vocational` | Vocational training | Traditional Trades | `iti`, `electrician`, `plumber`, `welder`, `rac`, `fitter`, `wireman` |
| `micro_ent` | Micro-entrepreneurship | Entrepreneurship | `business`, `mudra loan`, `startup`, `self employed`, `dukaan`, `funding` |
| `healthcare` | Healthcare & Patient Care (GDA) | Healthcare | `gda`, `general duty assistant`, `nursing`, `pharma`, `hospital`, `patient care` |
| `telecom` | Telecom & 5G Infrastructure | Telecom | `5g`, `optical fibre`, `telecom technician`, `ftth`, `tower` |
| `green_hydrogen`| Green Hydrogen & Clean Fuel | Clean Tech | `green hydrogen`, `electrolyzer`, `fuel cell`, `biofuel` |
| `industrial_iot`| Industrial IoT & Automation | Industry 4.0 | `plc`, `scada`, `industrial automation`, `sensors`, `robotics` |
| `retail_bfsi` | Retail, Banking & Financial Services | Services | `bfsi`, `banking`, `retail sales`, `cashier`, `customer service`, `bpo` |
| `tata_strive` | Tata STRIVE institutional updates | Institutional | `tata strive`, `strive centre`, `tata community initiatives` |

---

## 3. How Decisions and Scores are Calculated

### 3.1 The 5-Factor Opportunity Priority Scoring Formula

The priority score for every conversation cluster is calculated deterministically in [backend/app/opportunities_service.py](file:///c:/SEM/sem-4/mini_project/college/Code/backend/app/opportunities_service.py):

$$\text{Priority Score} = \text{round}\Big(0.25 \times V + 0.25 \times G + 0.25 \times R + 0.15 \times E + 0.10 \times U\Big)$$

Where:
- **$V$**: Volume Component (25% weight)
- **$G$**: Momentum & Growth Component (25% weight)
- **$R$**: Tata STRIVE Course Relevance (25% weight)
- **$E$**: Normalized Audience Engagement (15% weight)
- **$U$**: Community Unmet Need & Friction (10% weight)

---

### 3.2 Component Normalization & Scaling Mathematics

#### 1. Volume Score ($V \in [25, 100]$)
Measures the sheer scale of discussions within the selected time window relative to the highest-volume topic in that window:
$$V = \min\left(100, \max\left(25, \left\lfloor \frac{\text{Post Count}}{\text{Max Volume}} \times 100 \right\rfloor \right)\right)$$

#### 2. Growth / Momentum Score ($G \in [15, 100]$)
Compares current period volume ($N_{\text{current}}$) to the previous equal-length period ($N_{\text{prev}}$):
$$\text{Growth \%} = \frac{N_{\text{current}} - N_{\text{prev}}}{N_{\text{prev}}} \times 100$$
- **New Emerging Topic ($N_{\text{prev}} = 0$)**: $G = 70$ points (rewarding new conversation surges).
- **Positive Velocity ($\text{Growth \%} > 0$)**:
  $$G = \min\Big(100, \big\lfloor 50 + \min(50, \text{Growth \%} \times 0.75) \big\rfloor\Big)$$
- **Decelerating Topic ($\text{Growth \%} \le 0$)**:
  $$G = \max\Big(15, \big\lfloor 50 + \max(-35, \text{Growth \%} \times 0.5) \big\rfloor\Big)$$

#### 3. Tata STRIVE Course Relevance Score ($R \in [70, 95]$)
Grounded directly in the official Tata STRIVE curriculum ([DEFAULT_STRIVE_PROGRAMMES](file:///c:/SEM/sem-4/mini_project/college/Code/backend/app/trends/tatastrive_catalog.py)):
- **95 Points**: Direct alignment with core flagship courses (e.g., Electric Vehicle Service Technician, Solar PV Installer, Youth Employability Programme YEP, Digital Workplace Skills & AI Prompting).
- **85–90 Points**: Alignment with technical vocational trades (e.g., Drone Operations, Assistant Electrician & Industrial Automation).
- **70 Points**: Generic vocational skilling topic aligned with broad institutional certification.

#### 4. Engagement Score ($E \in [20, 100]$)
Captures audience resonance by aggregating raw public interactions:
$$\text{Raw Engagement} = \sum (\text{Likes} + \text{Comments} + \text{Views})$$
$$E = \min\left(100, \max\left(20, \left\lfloor \frac{\text{Raw Engagement}}{\text{Max Cluster Engagement}} \times 100 \right\rfloor \right)\right)$$

#### 5. Unmet Need & Learner Inquiries ($U \in [20, 100]$)
Identifies topics with high friction, confusion, or unanswered questions:
$$U = \min\left(100, \max\left(20, \left\lfloor \frac{1.5 \times Q_{\text{count}} + \text{Negative}_{\text{count}}}{\max(1, \text{Post Count})} \times 100 \right\rfloor \right)\right)$$
Where $Q_{\text{count}}$ is the count of posts identified as questions (`is_question = 1`), and $\text{Negative}_{\text{count}}$ is the count of posts classified as negative by RoBERTa.

---

### 3.3 Priority Tiers and Primary Score Drivers

| Score Range | Priority Tier | Operational Action for Tata STRIVE |
| :--- | :--- | :--- |
| **70 – 100** | **High Priority** | Launch immediate campaign, open centre admissions, schedule mobilisation drives. |
| **40 – 69** | **Medium Priority** | Develop lab curriculum, host informational webinars, monitor growth trajectory. |
| **0 – 39** | **Low Priority** | Passive listening; maintain baseline presence without dedicated advertising budget. |

#### Automatic Score Driver Explanation
The system determines the single largest contributor to the final score and generates a transparent explanation:
- Example: *"Score is driven mostly by demand volume (25.0 pts from 84 discussions)."*
- Example: *"Score is driven mostly by community inquiries (10.0 pts from 18 direct questions)."*

---

### 3.4 Opportunity Map 2D Quadrant Calculation

The Opportunity Map visualizes topics across a Cartesian coordinate plane:
- **X-Axis (Demand)**: Real mention volume in the active date range.
- **Y-Axis (Momentum)**: Real growth percentage vs. previous period.
- **Bubble Size (Z)**: Total engagement ($\text{Likes} + \text{Comments}$).

#### Dynamic Median Thresholds
Rather than arbitrary fixed cutoffs, quadrant dividers are calculated from the statistical medians of the current dataset:
$$\text{Median Demand} = \text{median}\big(\{D_1, D_2, \dots, D_k\}\big)$$
$$\text{Median Momentum} = \text{median}\big(\{M_1, M_2, \dots, M_k\}\big)$$

```
     Momentum (% Growth)
             ▲
             │
   PREPARE   │   ACT NOW
   CONTENT   │   (High Priority)
             │   Top-Right: Demand >= Median & Momentum >= Median
─────────────┼────────────────────────► Demand (Mentions)
   WATCH     │   PROTECT & MAINTAIN
             │   Bottom-Right: Demand >= Median & Momentum < Median
             │
```

1. **Act Now** ($D \ge \tilde{D} \land M \ge \tilde{M}$): High demand, surging momentum. Highest ROI for campaigns.
2. **Prepare Content** ($D < \tilde{D} \land M \ge \tilde{M}$): Emerging fast, but smaller absolute volume. Prepare trainer capacity and FAQs before demand peaks.
3. **Protect & Maintain** ($D \ge \tilde{D} \land M < \tilde{M}$): Established core vocational trades (e.g., electrician, fitter). Keep regular batch enrollments steady.
4. **Watch** ($D < \tilde{D} \land M < \tilde{M}$): Low volume, slow growth. Passive monitoring.

---

### 3.5 Audience Best-Time-To-Post Calculation (IST Conversion)

Calculated in [backend/app/audience_service.py](file:///c:/SEM/sem-4/mini_project/college/Code/backend/app/audience_service.py):
1. Ingests all stored post timestamps (`published_at` in ISO-8601 UTC).
2. Converts each timestamp to Indian Standard Time (IST):
   $$t_{\text{IST}} = t_{\text{UTC}} + \text{timedelta}(\text{hours}=5, \text{minutes}=30)$$
3. Aggregates posts into 24 hour buckets ($h \in [0, 23]$).
4. Computes the engagement-weighted frequency for each hour:
   $$\text{Weight}(h) = \sum_{p \in \text{Hour } h} (1 + p_{\text{likes}} \times 0.2)$$
5. Identifies peak engagement windows (typically 18:00 – 21:00 IST for Indian vocational youth) and renders the hourly breakdown.

---

## 4. Hallucination Prevention & Guardrail Verification

To guarantee complete credibility with Tata STRIVE evaluators:

```
[Database Metrics + Evidence Quotes] ➔ [Allowed Numbers Extractor]
                                                │
                                                ▼
[Groq LLM Generation Output] ➔ [Regex Number Verifier]
                                 ├── Number not in Allowed Set ➔ REJECT (Use Factual Fallback)
                                 └── All Numbers Valid ➔ ACCEPT & Render
```

1. **Allowed Numbers Whitelist**: [extract_allowed_numbers()](file:///c:/SEM/sem-4/mini_project/college/Code/backend/app/opportunities_service.py#L42) parses the input payload and extracts all legitimate numbers.
2. **Server-Side Output Inspection**: [validate_ai_text()](file:///c:/SEM/sem-4/mini_project/college/Code/backend/app/opportunities_service.py#L49) scans the LLM's generated text for any numeric substrings.
3. **Automatic Rejection**: If the LLM generates a metric like *"89% of youth"* when 89 was not in the database payload, the output is rejected and replaced with a deterministic factual sentence.

---

## 5. Summary Architecture Flow

```
[Raw Posts: YouTube, GDELT, Bluesky, RSS, Places]
                       │
                       ▼
    [Deduplication via URL Hash in SQLite]
                       │
                       ▼
        [13-Topic Taxonomy Engine]
          ├── CardiffNLP RoBERTa (Sentiment: Pos/Neu/Neg)
          ├── Holt-Winters ETS (>= 21 Real Days Required)
          └── 5-Factor Priority Scoring Engine (0-100 pts)
                       │
                       ▼
         [FastAPI Endpoints on Port 8000]
                       │
                       ▼
         [Next.js 16 Dashboard on Port 3000]
          ├── Overview (/)
          ├── Listening Feed (/feed)
          ├── Trend Intelligence (/trends)
          ├── Opportunity Radar (/opportunities)
          ├── Campaign Studio (/studio)
          └── Audience Insights (/audience)
```

---

*Authored for the Tata STRIVE Engineering & Leadership Team.*  
*Maintained under `README_AI_MODELS_AND_DECISIONS.md` in the root repository.*
