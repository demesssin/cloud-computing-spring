/**
 * intentParser.js — Keyword-based intent detection
 * Maps user messages to intent IDs from SSOT Section 3.1
 */

const INTENT_PATTERNS = [
  {
    intent: 'RESET',
    keywords: ['reset', 'start over', 'clear', 'new session', 'restart', 'begin again'],
  },
  {
    intent: 'COMPARE_MODELS',
    keywords: ['compare', 'cheapest model', 'best model', 'which llm', 'vs', 'versus', 'difference between'],
  },
  {
    intent: 'ESTIMATE_LLM',
    keywords: ['gpt', 'claude', 'gemini', 'llm', 'token', 'ai api', 'language model', 'openai', 'anthropic', 'model inference'],
  },
  {
    intent: 'ESTIMATE_COMPUTE',
    keywords: ['compute', 'server', 'vm', 'instance', 'virtual machine', 'cpu', 'vps', 'ec2', 'cloud run'],
  },
  {
    intent: 'ESTIMATE_STORAGE',
    keywords: ['storage', 'bucket', 's3', 'blob', 'object store', 'gcs', 'store ', 'storing', 'gigabyte', ' gb '],
  },
  {
    intent: 'ESTIMATE_DATABASE',
    keywords: ['database', ' db ', 'postgres', 'mysql', 'firestore', 'sql', 'nosql', 'cloud sql'],
  },
  {
    intent: 'ESTIMATE_SERVERLESS',
    keywords: ['function', 'lambda', 'serverless', 'trigger', 'cloud function', 'invocation'],
  },
  {
    intent: 'ESTIMATE_BANDWIDTH',
    keywords: ['bandwidth', 'cdn', 'traffic', 'egress', 'transfer', 'outbound', 'download'],
  },
  {
    intent: 'ESTIMATE_TOTAL',
    keywords: ['total', 'all components', 'everything', 'full stack', 'summary', 'grand total'],
  },
  {
    intent: 'EXPLAIN_COST',
    keywords: ['why', 'explain', 'how is', 'breakdown', 'what makes'],
  },
];

/**
 * Parse user message into an intent and extracted entities.
 * @param {string} message
 * @returns {{ intent: string, confidence: number }}
 */
function parseIntent(message) {
  const lower = message.toLowerCase();

  for (const pattern of INTENT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        return { intent: pattern.intent, confidence: 0.9 };
      }
    }
  }

  return { intent: 'GENERAL', confidence: 0.3 };
}

/**
 * Extract numeric entities from a message.
 * @param {string} message
 * @returns {Object} Extracted numbers with context
 */
function extractEntities(message) {
  const entities = {};

  // Extract numbers with units
  const gbMatch     = message.match(/(\d+(?:\.\d+)?)\s*(?:gb|gigabyte)/i);
  const tbMatch     = message.match(/(\d+(?:\.\d+)?)\s*(?:tb|terabyte)/i);
  const countMatch  = message.match(/(\d+)\s*(?:server|instance|vm|node)/i);
  const millionMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:m\b|million)/i);
  const tokenMatch  = message.match(/(\d+(?:,\d+)*)\s*token/i);

  if (gbMatch)      entities.gb          = parseFloat(gbMatch[1]);
  if (tbMatch)      entities.gb          = parseFloat(tbMatch[1]) * 1024;
  if (countMatch)   entities.count       = parseInt(countMatch[1]);
  if (millionMatch) entities.millions    = parseFloat(millionMatch[1]);
  if (tokenMatch)   entities.tokens      = parseInt(tokenMatch[1].replace(/,/g, ''));

  // Detect tier keywords
  const tiers = ['micro', 'small', 'medium', 'large', 'xlarge', 'x-large'];
  for (const tier of tiers) {
    if (message.toLowerCase().includes(tier)) {
      entities.tier = tier.replace('-', '');
      break;
    }
  }

  // Detect DB engine
  if (/postgres/i.test(message))  entities.dbEngine = 'postgresql';
  if (/mysql/i.test(message))     entities.dbEngine = 'mysql';
  if (/firestore/i.test(message)) entities.dbEngine = 'firestore';

  // Detect LLM model
  const modelMap = {
    'gpt-4o-mini': 'gpt4o_mini',
    'gpt4o-mini':  'gpt4o_mini',
    'gpt-4o':      'gpt4o',
    'gpt4o':       'gpt4o',
    'claude sonnet': 'claude_sonnet',
    'claude haiku':  'claude_haiku',
    'gemini 1.5 pro': 'gemini_pro',
    'gemini flash':   'gemini_flash',
    'gemini pro':     'gemini_pro',
  };
  for (const [key, val] of Object.entries(modelMap)) {
    if (message.toLowerCase().includes(key)) {
      entities.llmModel = val;
      break;
    }
  }

  return entities;
}

if (typeof module !== 'undefined') {
  module.exports = { parseIntent, extractEntities };
}
