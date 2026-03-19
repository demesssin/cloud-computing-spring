# CFO Bot — Cloud Cost Estimator
> AI-powered monthly cloud cost estimation chatbot built with Claude + Firebase

[![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase-FFCA28?logo=firebase)](https://firebase.google.com)
[![Built with Claude](https://img.shields.io/badge/Powered%20by-Claude%20API-7B5EA7)](https://anthropic.com)

---

## Project Overview

CFO Bot is a conversational AI agent that estimates monthly cloud infrastructure costs. Users describe their infrastructure in plain English, and CFO Bot applies deterministic pricing models to produce itemized cost breakdowns.

This project was built following **Spec-Driven Development (SDD)** methodology:
- All pricing logic is defined in [`docs/SYSTEM_SPECIFICATION.md`](docs/SYSTEM_SPECIFICATION.md) (SSOT)
- Implementation follows [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- Math correctness is verified by 31 test cases in [`docs/TEST_SPECIFICATIONS.md`](docs/TEST_SPECIFICATIONS.md)
- Business case is documented in [`docs/PRICING_STRATEGY.md`](docs/PRICING_STRATEGY.md)

---

## Live Demo

🔗 **[https://cfo-bot-cloud-estimator.web.app](https://cfo-bot-cloud-estimator.web.app)**

---

## Supported Cloud Components

| Component | Details |
|-----------|---------|
| 🖥️ Compute | 5 VM tiers (Micro → XLarge) with partial uptime support |
| 📦 Storage | GB cost + tiered egress pricing |
| 🗄️ Database | PostgreSQL, MySQL, Firestore |
| 🤖 LLM API | 6 models: GPT-4o, GPT-4o-mini, Claude Sonnet, Claude Haiku, Gemini Pro, Gemini Flash |
| ⚡ Serverless | Cloud Functions with free tier |
| 🌐 Bandwidth | Tiered CDN pricing |

---

## Project Structure

```
cfo-bot/
├── public/                   # Firebase Hosting root
│   ├── index.html            # Main SPA
│   ├── css/style.css         # Full stylesheet
│   └── js/
│       ├── pricingEngine.js  # Pure cost calculation functions
│       ├── intentParser.js   # Keyword intent detection
│       ├── chatEngine.js     # Claude API integration + state
│       ├── uiController.js   # DOM rendering layer
│       └── main.js           # App entry point
├── docs/
│   ├── SYSTEM_SPECIFICATION.md   # SSOT — Phase 1
│   ├── IMPLEMENTATION_PLAN.md    # Phase 2
│   ├── TEST_SPECIFICATIONS.md    # Phase 2
│   └── PRICING_STRATEGY.md      # Phase 4
├── firebase.json             # Firebase Hosting config
├── .firebaserc               # Firebase project config
└── README.md
```

---

## Quick Start (Local)

### 1. Clone and open

No build step needed — this is pure HTML/CSS/JS.

```bash
# Option A: Python HTTP server
cd cfo-bot/public
python3 -m http.server 3000
# Open: http://localhost:3000

# Option B: Node.js serve
npx serve public
```

### 2. Get an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key starting with `sk-ant-`
3. Enter it in the CFO Bot popup when you open the app

---

## Firebase Deployment

### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

### Deploy

```bash
# Initialize (first time only)
firebase init hosting
# → Select "Use existing project" → cfo-bot-cloud-estimator
# → Public directory: public
# → Single page app: Yes
# → Don't overwrite index.html

# Deploy
firebase deploy --only hosting
```

### Verify
```
✔  Deploy complete!
Project Console: https://console.firebase.google.com/project/cfo-bot-cloud-estimator
Hosting URL: https://cfo-bot-cloud-estimator.web.app
```

---

## Running Tests

Open the app with `?test=1` parameter to run all 31 pricing tests in the browser console:

```
https://localhost:3000?test=1
```

Or run in Node.js:
```bash
node -e "
const p = require('./public/js/pricingEngine.js');
p.runAllTests();
"
```

Expected output:
```
✅ TC-COMP-001: expected $5.0000, got $5.0000
✅ TC-COMP-002: expected $105.0000, got $105.0000
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Results: 31 passed, 0 failed
🎉 ALL TESTS PASSED
```

---

## Architecture Decisions

### Why Vanilla JS (No Framework)?
- Zero build step → direct Firebase Hosting deploy
- Matches SSOT constraint §4.1
- Faster initial load
- Easier to audit and explain

### Why Claude Haiku for LLM?
- As shown in the Pricing Strategy doc, Haiku is 92% cheaper than GPT-4o for equivalent tasks
- Temperature 0.1 ensures deterministic math output
- System prompt enforces strict pricing rules

### Why Firebase?
- Free Spark plan covers hosting for static sites
- Global CDN built-in
- Instant rollback capability
- Zero server management

---

## SDD Workflow Summary

```
SSOT (Spec) ──→ Agent Manager ──→ Artifacts
     │                               │
     │         ┌────────────────────┤
     │         ▼                    ▼
     │    Implementation Plan    Test Specs
     │         │                    │
     └─────────▼────────────────────▼
              Code Generation + Verification
                         │
                         ▼
                   Firebase Deploy
                         │
                         ▼
               Pricing Strategy Doc
```

---

## Team

Built by Information Systems students as part of the CFO Bot lab project.

---

## License

For educational use. Pricing data from published cloud provider rates (Q2 2025).
