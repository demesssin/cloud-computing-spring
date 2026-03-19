# CFO Bot — System Specification (SSOT)
**Version:** 1.0.0  
**Status:** Approved  
**Authors:** Group Project Team  
**Date:** 2025-06-01

---

## 1. Overview & Purpose

The **CFO Bot** is an AI-powered cloud cost estimation chatbot. It allows business stakeholders, startup founders, and engineering managers to estimate monthly cloud infrastructure costs by providing plain-language usage assumptions. The bot interprets user inputs, applies deterministic pricing models, and returns an itemized monthly cost breakdown.

### 1.1 Goals
- Provide accurate, reproducible cloud cost estimates via a conversational interface.
- Support multi-provider awareness (Google Cloud Platform primary, AWS/Azure reference).
- Eliminate manual spreadsheet calculations for infrastructure budgeting.

### 1.2 Non-Goals
- Real-time pricing API integration (pricing is hardcoded from published rates as of Q2 2025).
- Account billing or payment processing.
- Infrastructure provisioning or deployment.

---

## 2. Supported Cloud Components & Pricing Models

All prices are in **USD per unit per month** unless stated otherwise.

### 2.1 Compute (Virtual Machines / Cloud Run)

| Tier | vCPUs | RAM (GB) | Monthly Price (USD) | Identifier |
|------|-------|----------|----------------------|------------|
| Micro | 0.25 | 0.5 | $5.00 | `compute_micro` |
| Small | 1 | 2 | $18.00 | `compute_small` |
| Medium | 2 | 4 | $35.00 | `compute_medium` |
| Large | 4 | 16 | $90.00 | `compute_large` |
| XLarge | 8 | 32 | $175.00 | `compute_xlarge` |

**Formula:**
```
compute_cost = unit_price[tier] × instance_count × (hours_per_day / 24) × (days_per_month / 30)
```

**Defaults:** `hours_per_day = 24`, `days_per_month = 30`

---

### 2.2 Object Storage (Cloud Storage / S3-equivalent)

| Component | Rate |
|-----------|------|
| Storage | $0.020 per GB/month |
| Read Operations | $0.004 per 10,000 operations |
| Write Operations | $0.005 per 10,000 operations |
| Egress (first 1 TB) | $0.08 per GB |
| Egress (1–10 TB) | $0.06 per GB |
| Egress (>10 TB) | $0.05 per GB |

**Formula:**
```
storage_cost = storage_gb × 0.020
             + (read_ops / 10000) × 0.004
             + (write_ops / 10000) × 0.005
             + egress_cost(egress_gb)

egress_cost(gb):
  if gb <= 1024: return gb × 0.08
  if gb <= 10240: return 1024×0.08 + (gb−1024)×0.06
  else: return 1024×0.08 + 9216×0.06 + (gb−10240)×0.05
```

---

### 2.3 Bandwidth / CDN

| Tier | Price per GB |
|------|--------------|
| 0–1 TB | $0.08 |
| 1–10 TB | $0.06 |
| >10 TB | $0.04 |

**Formula:** Same tiered structure as egress above, applied to CDN traffic GB.

---

### 2.4 Managed Database

| Engine | Tier | vCPUs | RAM (GB) | Storage (GB) | Monthly Price |
|--------|------|-------|----------|--------------|---------------|
| PostgreSQL | Micro | 1 | 1 | 10 | $25.00 |
| PostgreSQL | Standard | 2 | 4 | 50 | $85.00 |
| PostgreSQL | Premium | 4 | 16 | 200 | $220.00 |
| MySQL | Micro | 1 | 1 | 10 | $23.00 |
| MySQL | Standard | 2 | 4 | 50 | $80.00 |
| Firestore | Serverless | — | — | per-op | see below |

**Firestore (NoSQL) Pricing:**
```
firestore_cost = (reads / 100000) × 0.06
               + (writes / 100000) × 0.18
               + (deletes / 100000) × 0.02
               + storage_gb × 0.108
```

**Relational DB Formula:**
```
db_cost = base_price[engine][tier] + (extra_storage_gb × 0.17)
```
`extra_storage_gb = max(0, actual_storage_gb − included_storage_gb[tier])`

---

### 2.5 AI/ML Model Inference (LLM API Calls)

| Model | Input tokens per $1 | Output tokens per $1 |
|-------|---------------------|----------------------|
| GPT-4o | 500,000 | 66,667 |
| GPT-4o-mini | 6,666,667 | 2,000,000 |
| Claude Sonnet | 333,333 | 66,667 |
| Claude Haiku | 4,000,000 | 1,250,000 |
| Gemini 1.5 Pro | 714,286 | 285,714 |
| Gemini Flash | 5,000,000 | 1,000,000 |

**Pricing per token (USD):**

| Model | Input $/1M tokens | Output $/1M tokens |
|-------|-------------------|--------------------|
| GPT-4o | $2.00 | $15.00 |
| GPT-4o-mini | $0.15 | $0.50 |
| Claude Sonnet | $3.00 | $15.00 |
| Claude Haiku | $0.25 | $0.80 |
| Gemini 1.5 Pro | $1.40 | $3.50 |
| Gemini Flash | $0.20 | $1.00 |

**Formula:**
```
llm_cost = (monthly_input_tokens / 1,000,000) × input_price[model]
         + (monthly_output_tokens / 1,000,000) × output_price[model]
```

---

### 2.6 Serverless Functions (Cloud Functions / Lambda)

| Component | Rate |
|-----------|------|
| Invocations | First 2M free, then $0.40 per 1M |
| Compute time | $0.00001667 per GB-second |
| Memory options | 128 MB, 256 MB, 512 MB, 1 GB, 2 GB |

**Formula:**
```
invocation_cost = max(0, monthly_invocations − 2,000,000) × 0.00000040
compute_time_cost = monthly_invocations × avg_duration_sec × (memory_mb / 1024) × 0.00001667
serverless_cost = invocation_cost + compute_time_cost
```

---

## 3. Conversation & Intent Architecture

### 3.1 Supported Intents

| Intent ID | Description | Example Utterance |
|-----------|-------------|-------------------|
| `ESTIMATE_COMPUTE` | Compute VM cost estimate | "I need 3 medium servers running 24/7" |
| `ESTIMATE_STORAGE` | Storage cost | "We store 500GB with 1M reads per month" |
| `ESTIMATE_DATABASE` | Database cost | "PostgreSQL Standard with 80GB storage" |
| `ESTIMATE_LLM` | LLM API cost | "10M GPT-4o tokens monthly, 70% input" |
| `ESTIMATE_SERVERLESS` | Functions cost | "5M function calls, 256MB, 200ms average" |
| `ESTIMATE_BANDWIDTH` | CDN/bandwidth | "2TB outbound traffic monthly" |
| `ESTIMATE_TOTAL` | Full stack estimate | Aggregate all components |
| `EXPLAIN_COST` | Explain a line item | "Why is my compute so expensive?" |
| `COMPARE_MODELS` | LLM model comparison | "Which LLM is cheapest for my usage?" |
| `RESET` | Clear session | "Start over" |

### 3.2 Conversation State Machine

```
[START] → [GREETING] → [COLLECT_COMPONENT] → [COLLECT_PARAMS] → [CALCULATE] → [PRESENT_RESULT] → [FOLLOW_UP]
                                                                                        ↑_________________↓
```

### 3.3 Required Bot Responses

Each estimate response MUST include:
1. Component name and tier selected
2. Parameters used (quantities, durations)
3. Line-item cost breakdown
4. **Monthly total** in bold
5. Assumptions stated explicitly
6. Option to add another component

---

## 4. Architectural Constraints

### 4.1 Frontend
- **Framework:** Vanilla HTML5 + CSS3 + JavaScript (ES6+)
- **No build step required** for Firebase Hosting (static files)
- **Responsive:** Mobile-first, breakpoints at 768px and 1200px
- **Accessibility:** WCAG 2.1 AA minimum
- **Browser Support:** Chrome 100+, Firefox 100+, Safari 15+, Edge 100+

### 4.2 Backend / AI Integration
- **Anthropic Claude API** via `/v1/messages` endpoint
- **Model:** `claude-sonnet-4-20250514`
- **System prompt:** Strictly enforced (see Section 5)
- **Max tokens:** 1024 per response
- **Temperature:** 0.1 (deterministic math priority)
- All pricing logic embedded in system prompt as SSOT

### 4.3 Firebase Configuration
- **Firebase Hosting:** Static files served via CDN
- **Firebase Functions (optional):** API key proxy for production security
- `firebase.json` with correct rewrites
- Public directory: `public/`

### 4.4 Security
- API key MUST be stored in environment variable, never hardcoded in client JS
- CORS headers enforced
- Rate limiting: 60 requests/minute per session

---

## 5. System Prompt Specification

The following system prompt is the **immutable contract** passed to the LLM on every request:

```
You are CFO Bot, a precise cloud infrastructure cost estimation assistant.
Your ONLY job is to calculate monthly cloud costs based on user-provided usage parameters.

PRICING RULES (apply EXACTLY — do not deviate):

COMPUTE (per instance/month):
- Micro (0.25 vCPU, 0.5GB RAM): $5.00
- Small (1 vCPU, 2GB RAM): $18.00
- Medium (2 vCPU, 4GB RAM): $35.00
- Large (4 vCPU, 16GB RAM): $90.00
- XLarge (8 vCPU, 32GB RAM): $175.00
Partial uptime formula: price × (hours_per_day/24) × (days/30)

STORAGE: $0.020/GB, reads $0.004/10K ops, writes $0.005/10K ops
Egress: $0.08/GB (0-1TB), $0.06/GB (1-10TB), $0.05/GB (>10TB)

DATABASE (monthly base):
- PostgreSQL Micro: $25, Standard: $85, Premium: $220
- MySQL Micro: $23, Standard: $80
- Extra storage: $0.17/GB above included amount
- Firestore: reads $0.06/100K, writes $0.18/100K, storage $0.108/GB/month

LLM API (per 1M tokens):
- GPT-4o: input $2.00, output $15.00
- GPT-4o-mini: input $0.15, output $0.50
- Claude Sonnet: input $3.00, output $15.00
- Claude Haiku: input $0.25, output $0.80
- Gemini 1.5 Pro: input $1.40, output $3.50
- Gemini Flash: input $0.20, output $1.00

SERVERLESS FUNCTIONS: First 2M invocations free, then $0.40/1M
Compute: $0.00001667 per GB-second

RESPONSE FORMAT:
Always respond with a structured breakdown:
1. List each component with its parameters and cost
2. Show the arithmetic clearly
3. Provide a TOTAL MONTHLY COST in bold
4. State all assumptions
5. Ask if they want to add more components

If asked about non-cloud-cost topics, politely redirect.
Always be precise — round to 2 decimal places.
```

---

## 6. UI/UX Requirements

### 6.1 Layout
- Split-pane: left sidebar (cost summary panel) + right main chat area
- Chat bubbles: user (right-aligned, accent color) and bot (left-aligned, neutral)
- Sticky header with product name and branding
- Cost summary panel updates dynamically as estimates are provided

### 6.2 Components
- **Chat input:** text field + send button + keyboard shortcut (Enter)
- **Message history:** scrollable, timestamps on hover
- **Cost card:** per-component cards in sidebar with running total
- **Quick action chips:** preset question buttons ("Estimate Compute", "Compare LLMs", etc.)
- **Loading indicator:** typing animation while awaiting API response
- **Export button:** download cost summary as JSON

### 6.3 Color System
- Primary background: `#0a0f1e` (dark navy)
- Surface: `#111827`
- Accent: `#00d4aa` (teal-green)
- Text primary: `#f1f5f9`
- Text secondary: `#94a3b8`
- Error: `#ef4444`
- Success: `#22c55e`

---

## 7. Error Handling & Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Missing required parameter | Bot asks clarifying question |
| Zero or negative quantities | Return $0.00 with note |
| Extremely large values (>1M instances) | Warn user, still calculate |
| Off-topic question | Politely redirect to cloud costs |
| API timeout (>10s) | Show error message, offer retry |
| Empty input | Do not submit, show hint |
| Firestore free tier usage | Apply free tier before billing |

---

## 8. Acceptance Criteria

- [ ] All 6 component types produce correct costs matching hand-calculated results
- [ ] Tiered pricing (egress, CDN) calculates breakpoints correctly
- [ ] LLM token costs correct for all 6 models
- [ ] Serverless free tier applied correctly
- [ ] Firebase deployment is publicly accessible
- [ ] System prompt cannot be overridden by user input
- [ ] Mobile layout functional at 375px width
- [ ] Response time <15 seconds (API dependent)

---

*End of System Specification v1.0.0*
