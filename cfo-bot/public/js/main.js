/**
 * main.js — CFO Bot Application Entry Point
 * Wires all modules together. No business logic here.
 */

const QUICK_CHIPS = [
  { label: '🖥️ Estimate Compute',    message: 'I need 2 medium servers running 24/7 for the whole month' },
  { label: '📦 Estimate Storage',    message: 'We store 500GB with 1 million reads and 200K writes per month' },
  { label: '🗄️ Database Cost',       message: 'PostgreSQL Standard tier with 80GB of storage' },
  { label: '🤖 Compare LLM Models',  message: 'Compare all LLM models for 10 million input tokens and 2 million output tokens per month' },
  { label: '⚡ Serverless Functions', message: '5 million function invocations, 256MB memory, average 200ms duration' },
  { label: '📊 Full Stack Estimate', message: 'I want a complete estimate: 2 medium servers, 200GB storage, PostgreSQL Standard with 60GB, Claude Haiku with 20M input and 5M output tokens, and 3M serverless invocations at 128MB 100ms' },
];

const WELCOME_MESSAGE = `👋 **Welcome to CFO Bot!**

I'm your AI-powered cloud cost estimation assistant. I can help you estimate monthly costs for:

• 🖥️ **Compute** — Virtual machines & cloud instances
• 📦 **Storage** — Object storage, operations & egress
• 🗄️ **Database** — PostgreSQL, MySQL & Firestore
• 🤖 **LLM API** — GPT-4o, Claude, Gemini & more
• ⚡ **Serverless** — Cloud Functions & Lambda
• 🌐 **Bandwidth** — CDN & data transfer

Just describe your infrastructure in plain English, or click one of the quick-start buttons below. I'll show you a detailed cost breakdown with all the math!

*What would you like to estimate?*`;

let apiKey = '';

/**
 * Get or prompt for API key.
 */
function getApiKey() {
  const stored = sessionStorage.getItem('cfo_api_key');
  if (stored) return stored;
  return null;
}

/**
 * Save API key to session storage.
 */
function saveApiKey(key) {
  apiKey = key.trim();
  sessionStorage.setItem('cfo_api_key', apiKey);
  toggleApiKeyOverlay(false);
}

/**
 * Handle sending a message.
 */
async function handleSend(messageOverride) {
  const text = messageOverride || UI.inputField?.value?.trim();
  if (!text) return;

  if (!apiKey) {
    toggleApiKeyOverlay(true);
    return;
  }

  // Clear input
  if (UI.inputField) UI.inputField.value = '';

  // Handle reset intent locally
  const { intent } = parseIntent(text);
  if (intent === 'RESET') {
    resetSession();
    clearChat();
    setTimeout(() => renderMessage('assistant', WELCOME_MESSAGE), 100);
    return;
  }

  // Render user message
  renderMessage('user', text);
  setInputDisabled(true);
  showTypingIndicator();

  try {
    const response = await sendMessage(text, apiKey);
    hideTypingIndicator();
    renderMessage('assistant', response);

    // Update cost panel
    const { costComponents, totalCost } = getState();
    updateCostPanel(costComponents, totalCost);

  } catch (err) {
    hideTypingIndicator();
    renderError(err.message || 'An unexpected error occurred.');

    // If auth error, re-prompt for key
    if (err.message?.includes('Invalid API key')) {
      apiKey = '';
      sessionStorage.removeItem('cfo_api_key');
      setTimeout(() => toggleApiKeyOverlay(true), 1500);
    }
  } finally {
    setInputDisabled(false);
    if (UI.inputField) UI.inputField.focus();
  }
}

/**
 * Handle export button click.
 */
function handleExport() {
  const json = exportSummary();
  downloadJSON(json);
}

/**
 * Initialize the application.
 */
function init() {
  // Init DOM references
  initUI();

  // Check API key
  apiKey = getApiKey() || '';
  if (!apiKey) {
    toggleApiKeyOverlay(true);
  }

  // Render quick chips
  renderQuickChips(QUICK_CHIPS, (msg) => handleSend(msg));

  // Show welcome message
  renderMessage('assistant', WELCOME_MESSAGE);

  // Wire send button
  document.getElementById('send-btn')?.addEventListener('click', () => handleSend());

  // Wire Enter key
  document.getElementById('user-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Wire export button
  document.getElementById('export-btn')?.addEventListener('click', handleExport);

  // Wire reset button
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    resetSession();
    clearChat();
    setTimeout(() => renderMessage('assistant', WELCOME_MESSAGE), 100);
  });

  // Wire API key form
  document.getElementById('api-key-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = document.getElementById('api-key-input')?.value;
    if (key?.startsWith('AIza')) {
      saveApiKey(key);
    } else {
      const err = document.getElementById('api-key-error');
      if (err) err.textContent = 'Key must start with AIza... (from aistudio.google.com)';
    }
  });

  // Run pricing tests in background (dev mode)
  if (window.location.search.includes('test=1')) {
    console.group('CFO Bot — Pricing Engine Tests');
    runAllTests();
    console.groupEnd();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
