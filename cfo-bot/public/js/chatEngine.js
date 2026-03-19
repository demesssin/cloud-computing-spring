/**
 * chatEngine.js — CFO Bot (Gemini API version)
 * Uses Google Gemini 2.0 Flash (free tier via AI Studio)
 * Auto-retry on rate limit (429)
 */

const SYSTEM_PROMPT = `You are CFO Bot, a precise cloud infrastructure cost estimation assistant.
Your ONLY job is to calculate monthly cloud costs based on user-provided usage parameters.

PRICING RULES (apply EXACTLY — do not deviate):

COMPUTE (per instance/month):
- Micro (0.25 vCPU, 0.5GB RAM): $5.00
- Small (1 vCPU, 2GB RAM): $18.00
- Medium (2 vCPU, 4GB RAM): $35.00
- Large (4 vCPU, 16GB RAM): $90.00
- XLarge (8 vCPU, 32GB RAM): $175.00
Partial uptime formula: price x (hours_per_day/24) x (days/30)

STORAGE: $0.020/GB/month, reads $0.004/10K ops, writes $0.005/10K ops
Egress: $0.08/GB (0-1TB), $0.06/GB (1-10TB), $0.05/GB (>10TB)

DATABASE (monthly base):
- PostgreSQL Micro: $25, Standard: $85, Premium: $220
- MySQL Micro: $23, Standard: $80
- Extra storage above included: $0.17/GB
- Firestore: reads $0.06/100K, writes $0.18/100K, deletes $0.02/100K, storage $0.108/GB/month

LLM API (per 1M tokens):
- GPT-4o: input $2.00, output $15.00
- GPT-4o-mini: input $0.15, output $0.50
- Claude Sonnet: input $3.00, output $15.00
- Claude Haiku: input $0.25, output $0.80
- Gemini 1.5 Pro: input $1.40, output $3.50
- Gemini Flash: input $0.20, output $1.00

SERVERLESS FUNCTIONS: First 2M invocations free, then $0.40/1M
Compute time: $0.00001667 per GB-second

CDN/BANDWIDTH: $0.08/GB (0-1TB), $0.06/GB (1-10TB), $0.04/GB (>10TB)

RESPONSE FORMAT:
1. State which component you are estimating
2. List the parameters used
3. Show the calculation step-by-step
4. State the MONTHLY COST in bold like: **Monthly Cost: $XX.XX**
5. List any assumptions made
6. Ask: "Would you like to add another component or see the total?"

When asked to compare LLM models: show a cost table for all models.
When asked for total: sum all components and show itemized breakdown.
If asked about non-cloud topics: "I am specialized in cloud cost estimation. What component would you like to price?"
Always round to 2 decimal places. Show your math.`;

const state = {
  messages: [],
  costComponents: {},
  totalCost: 0,
  sessionId: generateId(),
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function resetSession() {
  state.messages = [];
  state.costComponents = {};
  state.totalCost = 0;
  state.sessionId = generateId();
}

function addMessage(role, content) {
  state.messages.push({ role, content, timestamp: new Date().toISOString() });
}

function extractAndStoreCost(text, label) {
  const match = text.match(/\*\*Monthly Cost:\s*\$?([\d,]+\.?\d*)\*\*/i)
             || text.match(/monthly cost[:\s]+\$?([\d,]+\.?\d*)/i)
             || text.match(/\*\*Total[:\s]+\$?([\d,]+\.?\d*)\*\*/i);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      const key = label || `component_${Object.keys(state.costComponents).length + 1}`;
      state.costComponents[key] = amount;
      state.totalCost = Object.values(state.costComponents).reduce((a, b) => a + b, 0);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showRetryCountdown(seconds) {
  const bubble = document.querySelector('#typing-indicator .bubble');
  if (!bubble) return;
  let remaining = seconds;
  bubble.innerHTML = `<span style="font-size:13px;color:var(--text-secondary)">Подождите ${remaining}с, повтор автоматически...</span>`;
  const iv = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(iv);
      bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    } else {
      bubble.innerHTML = `<span style="font-size:13px;color:var(--text-secondary)">Подождите ${remaining}с, повтор автоматически...</span>`;
    }
  }, 1000);
}

async function sendMessage(userMessage, apiKey) {
  addMessage('user', userMessage);

  const contents = state.messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const RETRY_DELAYS = [15, 30, 60, 90];

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: contents,
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const botText = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n')
        || 'Sorry, I could not generate a response.';

      addMessage('assistant', botText);

      const intentResult = typeof parseIntent !== 'undefined' ? parseIntent(userMessage) : { intent: 'GENERAL' };
      const labels = {
        ESTIMATE_COMPUTE: '🖥️ Compute', ESTIMATE_STORAGE: '📦 Storage',
        ESTIMATE_DATABASE: '🗄️ Database', ESTIMATE_LLM: '🤖 LLM API',
        ESTIMATE_SERVERLESS: '⚡ Serverless', ESTIMATE_BANDWIDTH: '🌐 Bandwidth',
      };
      if (labels[intentResult.intent]) extractAndStoreCost(botText, labels[intentResult.intent]);

      return botText;
    }

    const code = response.status;
    const err = await response.json().catch(() => ({}));

    if (code === 403) throw new Error('Invalid API key. Get a free key at aistudio.google.com');

    if (code === 429 && attempt < RETRY_DELAYS.length) {
      const waitSec = RETRY_DELAYS[attempt];
      showRetryCountdown(waitSec);
      await sleep(waitSec * 1000);
      continue;
    }

    throw new Error(`Gemini API error ${code}: ${err.error?.message || 'Unknown error'}`);
  }

  throw new Error('Gemini перегружен. Попробуй ещё раз через минуту.');
}

function getState() { return { ...state }; }

function exportSummary() {
  return JSON.stringify({
    sessionId: state.sessionId,
    exportedAt: new Date().toISOString(),
    components: state.costComponents,
    totalMonthly: Math.round(state.totalCost * 100) / 100,
    totalAnnual: Math.round(state.totalCost * 12 * 100) / 100,
    messageCount: state.messages.length,
  }, null, 2);
}

if (typeof module !== 'undefined') {
  module.exports = { sendMessage, resetSession, addMessage, getState, exportSummary, state };
}
