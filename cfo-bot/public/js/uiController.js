/**
 * uiController.js — DOM Rendering Layer
 * All functions manipulate the DOM only. No business logic here.
 */

const UI = {
  chatMessages: null,
  costPanel: null,
  totalDisplay: null,
  inputField: null,
  sendBtn: null,
  typingIndicator: null,
};

/**
 * Initialize UI references.
 */
function initUI() {
  UI.chatMessages    = document.getElementById('chat-messages');
  UI.costPanel       = document.getElementById('cost-components');
  UI.totalDisplay    = document.getElementById('total-cost');
  UI.inputField      = document.getElementById('user-input');
  UI.sendBtn         = document.getElementById('send-btn');
  UI.typingIndicator = document.getElementById('typing-indicator');
}

/**
 * Render a chat message.
 * @param {'user'|'assistant'} role
 * @param {string} content - raw text (markdown-lite parsed)
 */
function renderMessage(role, content) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = formatContent(content);

  const ts = document.createElement('span');
  ts.className = 'timestamp';
  ts.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  wrapper.appendChild(bubble);
  wrapper.appendChild(ts);
  UI.chatMessages.appendChild(wrapper);
  UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
}

/**
 * Convert basic markdown to HTML.
 * @param {string} text
 * @returns {string}
 */
function formatContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/^#{1,3}\s(.+)$/gm, '<h4>$1</h4>');
}

/**
 * Show typing indicator.
 */
function showTypingIndicator() {
  UI.typingIndicator.style.display = 'flex';
  UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
}

/**
 * Hide typing indicator.
 */
function hideTypingIndicator() {
  UI.typingIndicator.style.display = 'none';
}

/**
 * Disable/enable input while waiting.
 * @param {boolean} disabled
 */
function setInputDisabled(disabled) {
  UI.inputField.disabled = disabled;
  UI.sendBtn.disabled = disabled;
}

/**
 * Update the cost summary panel.
 * @param {Object} components - {label: amount}
 * @param {number} total
 */
function updateCostPanel(components, total) {
  UI.costPanel.innerHTML = '';

  if (Object.keys(components).length === 0) {
    UI.costPanel.innerHTML = '<p class="empty-state">No estimates yet.<br>Start chatting to add components.</p>';
    UI.totalDisplay.textContent = '$0.00';
    return;
  }

  for (const [label, amount] of Object.entries(components)) {
    const card = document.createElement('div');
    card.className = 'cost-card';
    card.innerHTML = `
      <span class="cost-label">${label}</span>
      <span class="cost-amount">$${amount.toFixed(2)}</span>
    `;
    UI.costPanel.appendChild(card);
  }

  UI.totalDisplay.textContent = `$${total.toFixed(2)}`;
  UI.totalDisplay.classList.add('pulse');
  setTimeout(() => UI.totalDisplay.classList.remove('pulse'), 600);
}

/**
 * Render quick-action chips.
 * @param {Array<{label, message}>} chips
 * @param {Function} onClick
 */
function renderQuickChips(chips, onClick) {
  const container = document.getElementById('quick-chips');
  if (!container) return;

  container.innerHTML = '';
  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = chip.label;
    btn.addEventListener('click', () => onClick(chip.message));
    container.appendChild(btn);
  });
}

/**
 * Show an error message in chat.
 * @param {string} errorText
 */
function renderError(errorText) {
  const div = document.createElement('div');
  div.className = 'message assistant error';
  div.innerHTML = `<div class="bubble error-bubble">⚠️ ${errorText}</div>`;
  UI.chatMessages.appendChild(div);
  UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
}

/**
 * Download cost summary as JSON.
 * @param {string} jsonData
 */
function downloadJSON(jsonData) {
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `cfo-bot-estimate-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Clear the chat display.
 */
function clearChat() {
  UI.chatMessages.innerHTML = '';
  UI.costPanel.innerHTML = '<p class="empty-state">No estimates yet.<br>Start chatting to add components.</p>';
  UI.totalDisplay.textContent = '$0.00';
}

/**
 * Show/hide API key prompt overlay.
 * @param {boolean} show
 */
function toggleApiKeyOverlay(show) {
  const overlay = document.getElementById('api-key-overlay');
  if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

if (typeof module !== 'undefined') {
  module.exports = { initUI, renderMessage, showTypingIndicator, hideTypingIndicator,
    setInputDisabled, updateCostPanel, renderQuickChips, renderError, downloadJSON, clearChat, toggleApiKeyOverlay };
}
