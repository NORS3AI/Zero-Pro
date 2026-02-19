// ai.js — Claude AI writing assistant sidebar
// Phase 3: AI Writing Assistant

const API_BASE        = 'https://api.anthropic.com/v1';
const MODEL           = 'claude-opus-4-6';
const API_KEY_STORAGE = 'zeropro_api_key';

// ─── Prompt Templates ─────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    build: ctx => {
      const intro = ctx.title ? `I'm working on a scene titled "${ctx.title}".${ctx.synopsis ? ` Synopsis: ${ctx.synopsis}.` : ''}` : '';
      return `${intro}\n\nGive me 5 distinct ways this scene could develop, each with a brief explanation of the narrative impact.`.trim();
    },
  },
  {
    id: 'polish',
    label: 'Polish Prose',
    build: ctx => `Rewrite the following passage in tighter, more vivid prose while preserving the author's voice and intent:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'continue',
    label: 'Continue',
    build: ctx => `Continue the following scene for approximately 200 words, matching the style and tone exactly:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'dialogue',
    label: 'Fix Dialogue',
    build: ctx => `Rewrite the following dialogue to feel more natural and reveal character more clearly:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'summarise',
    label: 'Summarise',
    build: ctx => `Summarise the following scene in 2–3 sentences, capturing the key events and emotional beats:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'names',
    label: 'Name Ideas',
    build: ctx => `Suggest 10 character names${ctx.title ? ` fitting the world and tone of "${ctx.title}"` : ''}. Include a brief note on the feel or origin of each name.`,
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject    = null;
let _getCurrentDoc = null;
let _apiKey        = null;
let _isStreaming   = false;
let _lastResponse  = '';
let _onChunk       = () => {};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the AI module. Call once at app boot.
 * @param {{ getProject: () => Object, getCurrentDoc: () => Object|null }} opts
 */
export function initAI({ getProject, getCurrentDoc }) {
  _getProject    = getProject;
  _getCurrentDoc = getCurrentDoc;
  _apiKey        = localStorage.getItem(API_KEY_STORAGE) || null;

  _buildUI();
}

/** Toggle the AI sidebar open / closed. */
export function toggleAIPanel() {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  const isOpen = workspace.classList.toggle('ai-open');
  document.getElementById('ai-panel')?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  document.getElementById('btn-ai')?.classList.toggle('active', isOpen);
  document.getElementById('btn-ai')?.setAttribute('aria-pressed', isOpen ? 'true' : 'false');

  if (isOpen) _refreshContextLabel();
}

// ─── UI Construction ──────────────────────────────────────────────────────────

function _buildUI() {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div id="ai-header">
      <span class="ai-title">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.5 11.5-4-2.3V4h1v4.65l3.5 2.02-.5.83z"/></svg>
        Ask Claude
      </span>
      <button class="ai-close-btn" id="btn-ai-close" title="Close" aria-label="Close AI panel">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/></svg>
      </button>
    </div>

    <div id="ai-body">

      <!-- No-key banner -->
      <div id="ai-key-banner" class="ai-key-banner hidden">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.793.793 1.025-1.025-1.5-1.5H7.163a.5.5 0 0 1-.45-.285A3 3 0 0 0 4 5z"/><path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
        Add your Anthropic API key below to start writing with Claude.
      </div>

      <!-- Quick-prompt template chips -->
      <div class="ai-section-label">Quick prompts</div>
      <div id="ai-templates" class="ai-chips" role="group" aria-label="Prompt templates">
        ${TEMPLATES.map(t => `<button class="ai-chip" data-template="${t.id}">${t.label}</button>`).join('')}
      </div>

      <!-- Context row -->
      <div class="ai-context-row">
        <div class="ai-context-info">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>
          <span id="ai-context-label">No document open</span>
        </div>
        <label class="ai-toggle-wrap" title="Include document text as context">
          <input type="checkbox" id="ai-include-content" checked>
          <span>Include text</span>
        </label>
      </div>

      <!-- Prompt input -->
      <div class="ai-section-label">Your prompt</div>
      <textarea id="ai-prompt" class="ai-prompt-input"
                placeholder="Ask anything about your writing…"
                rows="5"
                aria-label="Prompt to send to Claude"></textarea>
      <div class="ai-prompt-footer">
        <span id="ai-token-estimate" class="ai-token-estimate"></span>
        <button class="ai-send-btn" id="btn-ai-send" title="Send (Ctrl+Enter)" aria-label="Send">
          <svg viewBox="0 0 16 16" fill="currentColor"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11zM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493z"/></svg>
          Send
        </button>
      </div>

      <!-- Response area -->
      <div id="ai-response-section" class="hidden">
        <div class="ai-response-header">
          <span class="ai-section-label">Response</span>
          <button class="ai-action-sm" id="btn-ai-clear">Clear</button>
        </div>
        <div id="ai-response" class="ai-response" aria-live="polite" aria-label="Claude's response"></div>
        <div class="ai-response-actions">
          <button class="ai-action-btn" id="btn-ai-insert">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2H9v5a1 1 0 1 1-2 0V8H2a1 1 0 0 1 0-2h5V1a1 1 0 0 1 1-1z"/></svg>
            Insert at cursor
          </button>
          <button class="ai-action-btn" id="btn-ai-copy">
            <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>
            Copy
          </button>
        </div>
      </div>

      <!-- API key settings -->
      <details id="ai-settings" class="ai-settings">
        <summary class="ai-settings-toggle">API Key Settings</summary>
        <div class="ai-settings-body">
          <p class="ai-settings-warn">
            Your key is stored in this browser's localStorage. Do not use Zero Pro on shared or public computers with your key saved.
          </p>
          <div id="ai-key-status" class="ai-key-status"></div>
          <input type="password" id="ai-key-input" class="ai-key-input"
                 placeholder="sk-ant-api03-…"
                 autocomplete="off"
                 aria-label="Anthropic API key">
          <div class="ai-settings-actions">
            <button class="ai-action-btn primary" id="btn-ai-save-key">Save &amp; Validate</button>
            <button class="ai-action-btn danger"   id="btn-ai-clear-key">Clear Key</button>
          </div>
          <p class="ai-settings-hint">
            Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>
          </p>
        </div>
      </details>

    </div><!-- /ai-body -->
  `;

  _updateKeyStatus();
  _bindEvents();
}

function _bindEvents() {
  // Close panel
  document.getElementById('btn-ai-close')?.addEventListener('click', toggleAIPanel);

  // Template chips
  document.getElementById('ai-templates')?.addEventListener('click', e => {
    const chip = e.target.closest('.ai-chip');
    if (!chip) return;
    const template = TEMPLATES.find(t => t.id === chip.dataset.template);
    if (!template) return;
    const ctx = _buildContext();
    document.getElementById('ai-prompt').value = template.build(ctx);
    _updateTokenEstimate();
  });

  // Live token estimate
  document.getElementById('ai-prompt')?.addEventListener('input', _updateTokenEstimate);

  // Send
  document.getElementById('btn-ai-send')?.addEventListener('click', _handleSend);
  document.getElementById('ai-prompt')?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); _handleSend(); }
  });

  // Response actions
  document.getElementById('btn-ai-clear')?.addEventListener('click', _clearResponse);
  document.getElementById('btn-ai-insert')?.addEventListener('click', () => {
    if (_lastResponse) _insertAtCursor(_lastResponse);
  });
  document.getElementById('btn-ai-copy')?.addEventListener('click', _copyResponse);

  // API key
  document.getElementById('btn-ai-save-key')?.addEventListener('click', _handleSaveKey);
  document.getElementById('btn-ai-clear-key')?.addEventListener('click', _handleClearKey);
  document.getElementById('ai-key-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _handleSaveKey();
  });

  // Refresh context label whenever the panel becomes visible
  const workspace = document.getElementById('workspace');
  if (workspace) {
    new MutationObserver(() => {
      if (workspace.classList.contains('ai-open')) _refreshContextLabel();
    }).observe(workspace, { attributes: true, attributeFilter: ['class'] });
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

function _buildContext() {
  const project        = _getProject?.();
  const doc            = _getCurrentDoc?.();
  const includeContent = document.getElementById('ai-include-content')?.checked ?? true;
  const selection      = _getEditorSelection();

  let excerpt = '';
  if (includeContent) {
    if (selection) {
      excerpt = selection;
    } else if (doc?.content) {
      const tmp  = document.createElement('div');
      tmp.innerHTML = doc.content;
      const text = tmp.innerText || tmp.textContent || '';
      excerpt = text.length > 3000 ? text.slice(0, 3000) + '…' : text;
    }
  }

  return {
    title:        doc?.title        || '',
    synopsis:     doc?.synopsis     || '',
    pov:          doc?.pov          || '',
    location:     doc?.location     || '',
    projectTitle: project?.title    || '',
    selection,
    excerpt,
  };
}

function _buildSystemPrompt(ctx) {
  const parts = ['You are a skilled creative writing assistant helping an author with their manuscript.'];
  if (ctx.projectTitle) parts.push(`Project: "${ctx.projectTitle}".`);
  if (ctx.title)        parts.push(`Current scene: "${ctx.title}".`);
  if (ctx.synopsis)     parts.push(`Synopsis: ${ctx.synopsis}.`);
  if (ctx.pov)          parts.push(`POV character: ${ctx.pov}.`);
  if (ctx.location)     parts.push(`Setting: ${ctx.location}.`);
  parts.push("Be concise, creative, and match the author's existing style and tone.");
  return parts.join(' ');
}

function _buildUserMessage(prompt, ctx) {
  const parts = [prompt];
  if (ctx.selection) {
    parts.push(`\n\n---\nSelected text:\n${ctx.selection}`);
  } else if (ctx.excerpt && document.getElementById('ai-include-content')?.checked) {
    parts.push(`\n\n---\nDocument text:\n${ctx.excerpt}`);
  }
  return parts.join('');
}

function _getEditorSelection() {
  const editor = document.getElementById('editor');
  if (!editor) return '';
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return '';
  if (!editor.contains(sel.anchorNode)) return '';
  return sel.toString().trim();
}

function _refreshContextLabel() {
  const doc   = _getCurrentDoc?.();
  const label = document.getElementById('ai-context-label');
  if (label) label.textContent = doc?.title || 'No document open';
}

function _updateTokenEstimate() {
  const prompt = document.getElementById('ai-prompt')?.value || '';
  const ctx    = _buildContext();
  const total  = prompt + (ctx.excerpt || '') + (ctx.synopsis || '');
  const tokens = Math.ceil(total.length / 4);
  const el     = document.getElementById('ai-token-estimate');
  if (el) el.textContent = prompt ? `~${tokens.toLocaleString()} tokens` : '';
}

// ─── API Key Management ───────────────────────────────────────────────────────

function _updateKeyStatus() {
  const banner = document.getElementById('ai-key-banner');
  const status = document.getElementById('ai-key-status');

  if (_apiKey) {
    banner?.classList.add('hidden');
    if (status) { status.textContent = 'Key saved'; status.className = 'ai-key-status ok'; }
  } else {
    banner?.classList.remove('hidden');
    if (status) { status.textContent = 'No key set'; status.className = 'ai-key-status'; }
  }
}

async function _handleSaveKey() {
  const input = document.getElementById('ai-key-input');
  const key   = input?.value.trim();
  if (!key) return;

  const status = document.getElementById('ai-key-status');
  if (status) { status.textContent = 'Validating…'; status.className = 'ai-key-status'; }

  const valid = await _validateKey(key);
  if (valid) {
    _apiKey = key;
    localStorage.setItem(API_KEY_STORAGE, key);
    if (input) input.value = '';
    _updateKeyStatus();
  } else {
    if (status) { status.textContent = 'Invalid key — please check and try again.'; status.className = 'ai-key-status error'; }
  }
}

function _handleClearKey() {
  _apiKey = null;
  localStorage.removeItem(API_KEY_STORAGE);
  _updateKeyStatus();
}

async function _validateKey(key) {
  try {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: _makeHeaders(key),
      body: JSON.stringify({ model: MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'Hi' }] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function _makeHeaders(key = _apiKey) {
  return {
    'x-api-key':   key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

// ─── Send & Stream ────────────────────────────────────────────────────────────

async function _handleSend() {
  if (_isStreaming) return;

  const promptEl = document.getElementById('ai-prompt');
  const prompt   = promptEl?.value.trim();
  if (!prompt) return;

  if (!_apiKey) {
    document.getElementById('ai-settings')?.setAttribute('open', '');
    document.getElementById('ai-key-input')?.focus();
    return;
  }

  const ctx = _buildContext();
  _startStreaming();

  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: _makeHeaders(),
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        stream: true,
        system: _buildSystemPrompt(ctx),
        messages: [{ role: 'user', content: _buildUserMessage(prompt, ctx) }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      _showError(err?.error?.message || `API error ${response.status}`);
      _stopStreaming(false);
      return;
    }

    await _streamSSE(response.body);
    _stopStreaming(true);
  } catch (e) {
    _showError(e.message);
    _stopStreaming(false);
  }
}

async function _streamSSE(body) {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') return;
        try {
          const ev = JSON.parse(json);
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
            _onChunk(ev.delta.text);
          }
          if (ev.type === 'message_stop') return;
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

function _startStreaming() {
  _isStreaming  = true;
  _lastResponse = '';

  const section    = document.getElementById('ai-response-section');
  const responseEl = document.getElementById('ai-response');
  const sendBtn    = document.getElementById('btn-ai-send');

  section?.classList.remove('hidden');
  if (responseEl) {
    responseEl.textContent = '';
    responseEl.className   = 'ai-response streaming';
  }
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Generating…'; }

  _onChunk = text => {
    _lastResponse += text;
    if (responseEl) {
      responseEl.textContent = _lastResponse;
      responseEl.scrollTop   = responseEl.scrollHeight;
    }
  };
}

function _stopStreaming(success) {
  _isStreaming = false;
  const responseEl = document.getElementById('ai-response');
  const sendBtn    = document.getElementById('btn-ai-send');

  if (responseEl) responseEl.classList.remove('streaming');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11zM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493z"/></svg> Send`;
  }
}

function _showError(message) {
  const responseEl = document.getElementById('ai-response');
  if (responseEl) {
    responseEl.textContent = `Error: ${message}`;
    responseEl.className   = 'ai-response error';
  }
  document.getElementById('ai-response-section')?.classList.remove('hidden');
}

function _clearResponse() {
  _lastResponse = '';
  const responseEl = document.getElementById('ai-response');
  if (responseEl) { responseEl.textContent = ''; responseEl.className = 'ai-response'; }
  document.getElementById('ai-response-section')?.classList.add('hidden');
}

async function _copyResponse() {
  if (!_lastResponse) return;
  try {
    await navigator.clipboard.writeText(_lastResponse);
    const btn = document.getElementById('btn-ai-copy');
    if (btn) {
      const prev = btn.innerHTML;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.innerHTML = prev; }, 1500);
    }
  } catch { /* clipboard denied */ }
}

// ─── Insert at cursor ─────────────────────────────────────────────────────────

function _insertAtCursor(text) {
  const editor = document.getElementById('editor');
  if (!editor || editor.contentEditable !== 'true') return;
  editor.focus();

  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return;
  lines.forEach((line, i) => {
    if (i > 0) document.execCommand('insertParagraph');
    document.execCommand('insertText', false, line);
  });
}
