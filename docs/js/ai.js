// ai.js — Multi-provider AI writing assistant sidebar
// Providers: Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google)

// ─── Provider Registry ────────────────────────────────────────────────────────
// Each provider implements the same skeleton:
//   headers(key)           → request headers object
//   endpoint(key, model)   → URL string
//   buildBody(msgs, sys, model) → JSON string body
//   extractChunk(parsed)   → string | null
//   isDone(parsed)         → boolean

const PROVIDERS = {
  claude: {
    id:           'claude',
    name:         'Claude',
    model:        'claude-opus-4-6',
    keyStorage:   'zeropro_api_key_claude',
    keyPlaceholder: 'sk-ant-api03-…',
    keyHintUrl:   'https://console.anthropic.com/settings/keys',
    keyHintLabel: 'Anthropic Console',
    keyHintNote:  'Sign in → Settings → API Keys → Create Key',

    headers: key => ({
      'x-api-key':          key,
      'anthropic-version':  '2023-06-01',
      'content-type':       'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),

    endpoint: (_key, _model) => 'https://api.anthropic.com/v1/messages',

    buildBody: (messages, system, model) => JSON.stringify({
      model, max_tokens: 1024, stream: true, system, messages,
    }),

    extractChunk: ev =>
      ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta'
        ? ev.delta.text
        : null,

    isDone: ev => ev.type === 'message_stop',
  },

  openai: {
    id:           'openai',
    name:         'ChatGPT',
    model:        'gpt-4o',
    keyStorage:   'zeropro_api_key_openai',
    keyPlaceholder: 'sk-proj-…',
    keyHintUrl:   'https://platform.openai.com/api-keys',
    keyHintLabel: 'OpenAI Platform',
    keyHintNote:  'Sign in → API keys → Create new secret key',

    headers: key => ({
      'Authorization': `Bearer ${key}`,
      'content-type':  'application/json',
    }),

    endpoint: (_key, _model) => 'https://api.openai.com/v1/chat/completions',

    buildBody: (messages, system, model) => JSON.stringify({
      model, stream: true,
      messages: [{ role: 'system', content: system }, ...messages],
    }),

    extractChunk: ev => ev.choices?.[0]?.delta?.content ?? null,

    isDone: ev => ev.choices?.[0]?.finish_reason === 'stop',
  },

  gemini: {
    id:           'gemini',
    name:         'Gemini',
    model:        'gemini-2.0-flash',
    keyStorage:   'zeropro_api_key_gemini',
    keyPlaceholder: 'AIzaSy…',
    keyHintUrl:   'https://aistudio.google.com/app/apikey',
    keyHintLabel: 'Google AI Studio',
    keyHintNote:  'Sign in → Get API key → Create API key',

    headers: _key => ({ 'content-type': 'application/json' }),

    endpoint: (key, model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}&alt=sse`,

    buildBody: (messages, system, _model) => JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    }),

    extractChunk: ev =>
      ev.candidates?.[0]?.content?.parts?.[0]?.text ?? null,

    isDone: ev => ev.candidates?.[0]?.finishReason === 'STOP',
  },
};

const PROVIDER_IDS  = Object.keys(PROVIDERS);
const STORAGE_PROVIDER = 'zeropro_ai_provider';

// ─── Prompt Templates ─────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'brainstorm', label: 'Brainstorm',
    build: ctx => {
      const intro = ctx.title
        ? `I'm working on a scene titled "${ctx.title}".${ctx.synopsis ? ` Synopsis: ${ctx.synopsis}.` : ''}`
        : '';
      return `${intro}\n\nGive me 5 distinct ways this scene could develop, each with a brief explanation of the narrative impact.`.trim();
    },
  },
  {
    id: 'polish', label: 'Polish Prose',
    build: ctx => `Rewrite the following passage in tighter, more vivid prose while preserving the author's voice:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'continue', label: 'Continue',
    build: ctx => `Continue the following scene for approximately 200 words, matching the style and tone exactly:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'dialogue', label: 'Fix Dialogue',
    build: ctx => `Rewrite the following dialogue to feel more natural and reveal character more clearly:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'summarise', label: 'Summarise',
    build: ctx => `Summarise the following scene in 2–3 sentences, capturing the key events and emotional beats:\n\n${ctx.selection || ctx.excerpt}`,
  },
  {
    id: 'names', label: 'Name Ideas',
    build: ctx => `Suggest 10 character names${ctx.title ? ` fitting the world and tone of "${ctx.title}"` : ''}. Include a brief note on the feel or origin of each name.`,
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject    = null;
let _getCurrentDoc = null;
let _activeId      = localStorage.getItem(STORAGE_PROVIDER) || 'claude';
let _keys          = {};   // { claude: 'sk-…', openai: 'sk-…', gemini: 'AIza…' }
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

  // Load all stored keys
  PROVIDER_IDS.forEach(id => {
    _keys[id] = localStorage.getItem(PROVIDERS[id].keyStorage) || null;
  });

  // Ensure saved provider ID is still valid
  if (!PROVIDERS[_activeId]) _activeId = 'claude';

  _buildUI();
}

/** Toggle the AI sidebar open / closed. */
export function toggleAIPanel() {
  const workspace = document.getElementById('workspace');
  if (!workspace) return;

  const isOpen = workspace.classList.toggle('ai-open');
  document.getElementById('ai-panel')?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

  const btn = document.getElementById('btn-ai');
  btn?.classList.toggle('active', isOpen);
  btn?.setAttribute('aria-pressed', isOpen ? 'true' : 'false');

  if (isOpen) _refreshContextLabel();
}

// ─── UI Construction ──────────────────────────────────────────────────────────

function _buildUI() {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div id="ai-header">
      <span class="ai-title">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm.5 12.5h-1v-5h1v5zm0-6.5h-1V4.5h1V6z"/></svg>
        Ask <span id="ai-provider-name">${PROVIDERS[_activeId].name}</span>
      </span>
      <button class="ai-close-btn" id="btn-ai-close" title="Close" aria-label="Close AI panel">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/></svg>
      </button>
    </div>

    <div id="ai-body">

      <!-- No-key banner -->
      <div id="ai-key-banner" class="ai-key-banner hidden">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.793.793 1.025-1.025-1.5-1.5H7.163a.5.5 0 0 1-.45-.285A3 3 0 0 0 4 5z"/><path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
        <span id="ai-key-banner-text">Add your API key below to start.</span>
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
                aria-label="Prompt to send to AI"></textarea>
      <div class="ai-prompt-footer">
        <span id="ai-token-estimate" class="ai-token-estimate"></span>
        <button class="ai-send-btn" id="btn-ai-send" title="Send (Ctrl+Enter)">
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
        <div id="ai-response" class="ai-response" aria-live="polite" aria-label="AI response"></div>
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

      <!-- Settings -->
      <details id="ai-settings" class="ai-settings">
        <summary class="ai-settings-toggle">Settings</summary>
        <div class="ai-settings-body">

          <div class="ai-section-label">AI Provider</div>
          <div class="ai-provider-selector" role="group" aria-label="Choose AI provider">
            ${PROVIDER_IDS.map(id => `
              <button class="ai-provider-btn${id === _activeId ? ' active' : ''}"
                      data-provider="${id}"
                      aria-pressed="${id === _activeId ? 'true' : 'false'}">
                ${PROVIDERS[id].name}
              </button>`).join('')}
          </div>

          <div id="ai-key-section"></div>

          <p class="ai-settings-warn">
            Keys are stored in this browser's localStorage. Do not use on shared or public computers.
          </p>

        </div>
      </details>

    </div><!-- /ai-body -->
  `;

  _renderKeySection();
  _updateBanner();
  _bindEvents();
}

function _renderKeySection() {
  const container = document.getElementById('ai-key-section');
  if (!container) return;

  const provider = PROVIDERS[_activeId];
  const hasKey   = !!_keys[_activeId];

  container.innerHTML = `
    <div id="ai-key-status" class="ai-key-status${hasKey ? ' ok' : ''}">
      ${hasKey ? `${provider.name} key saved` : `No ${provider.name} key set`}
    </div>
    <input type="password" id="ai-key-input" class="ai-key-input"
           placeholder="${provider.keyPlaceholder}"
           autocomplete="off"
           aria-label="${provider.name} API key">
    <div class="ai-settings-actions">
      <button class="ai-action-btn primary" id="btn-ai-save-key">Save &amp; Validate</button>
      <button class="ai-action-btn danger"   id="btn-ai-clear-key">Clear Key</button>
    </div>
    <p class="ai-settings-hint">
      Get your key at
      <a href="${provider.keyHintUrl}" target="_blank" rel="noopener">${provider.keyHintLabel}</a>
      <span class="ai-settings-hint-note">${provider.keyHintNote}</span>
    </p>
  `;

  _bindKeyEvents();
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function _bindEvents() {
  // Close
  document.getElementById('btn-ai-close')?.addEventListener('click', toggleAIPanel);

  // Template chips
  document.getElementById('ai-templates')?.addEventListener('click', e => {
    const chip = e.target.closest('.ai-chip');
    if (!chip) return;
    const tmpl = TEMPLATES.find(t => t.id === chip.dataset.template);
    if (!tmpl) return;
    document.getElementById('ai-prompt').value = tmpl.build(_buildContext());
    _updateTokenEstimate();
  });

  // Token estimate on input
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

  // Provider selector (delegated on the panel body)
  document.getElementById('ai-body')?.addEventListener('click', e => {
    const btn = e.target.closest('.ai-provider-btn');
    if (btn) _switchProvider(btn.dataset.provider);
  });

  // Refresh context when panel opens
  const workspace = document.getElementById('workspace');
  if (workspace) {
    new MutationObserver(() => {
      if (workspace.classList.contains('ai-open')) _refreshContextLabel();
    }).observe(workspace, { attributes: true, attributeFilter: ['class'] });
  }
}

function _bindKeyEvents() {
  document.getElementById('btn-ai-save-key')?.addEventListener('click', _handleSaveKey);
  document.getElementById('btn-ai-clear-key')?.addEventListener('click', _handleClearKey);
  document.getElementById('ai-key-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _handleSaveKey();
  });
}

// ─── Provider Switching ───────────────────────────────────────────────────────

function _switchProvider(id) {
  if (!PROVIDERS[id] || id === _activeId) return;

  _activeId = id;
  localStorage.setItem(STORAGE_PROVIDER, id);

  // Update header name
  const nameEl = document.getElementById('ai-provider-name');
  if (nameEl) nameEl.textContent = PROVIDERS[id].name;

  // Update provider button states
  document.querySelectorAll('.ai-provider-btn').forEach(btn => {
    const match = btn.dataset.provider === id;
    btn.classList.toggle('active', match);
    btn.setAttribute('aria-pressed', match ? 'true' : 'false');
  });

  _renderKeySection();
  _updateBanner();
}

// ─── Context ──────────────────────────────────────────────────────────────────

function _buildContext() {
  const doc            = _getCurrentDoc?.();
  const project        = _getProject?.();
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
  if (!sel || sel.isCollapsed || !editor.contains(sel.anchorNode)) return '';
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

function _updateBanner() {
  const banner  = document.getElementById('ai-key-banner');
  const textEl  = document.getElementById('ai-key-banner-text');
  const hasKey  = !!_keys[_activeId];

  banner?.classList.toggle('hidden', hasKey);
  if (textEl && !hasKey) {
    textEl.textContent = `Add your ${PROVIDERS[_activeId].name} API key in Settings to start.`;
  }
}

async function _handleSaveKey() {
  const input = document.getElementById('ai-key-input');
  const key   = input?.value.trim();
  if (!key) return;

  const status = document.getElementById('ai-key-status');
  if (status) { status.textContent = 'Validating…'; status.className = 'ai-key-status'; }

  const valid = await _validateKey(_activeId, key);
  if (valid) {
    _keys[_activeId] = key;
    localStorage.setItem(PROVIDERS[_activeId].keyStorage, key);
    if (input) input.value = '';
    if (status) { status.textContent = `${PROVIDERS[_activeId].name} key saved`; status.className = 'ai-key-status ok'; }
    _updateBanner();
  } else {
    if (status) { status.textContent = 'Invalid key — please check and try again.'; status.className = 'ai-key-status error'; }
  }
}

function _handleClearKey() {
  _keys[_activeId] = null;
  localStorage.removeItem(PROVIDERS[_activeId].keyStorage);
  _renderKeySection();
  _updateBanner();
}

async function _validateKey(providerId, key) {
  const provider = PROVIDERS[providerId];
  try {
    const res = await fetch(provider.endpoint(key, provider.model), {
      method:  'POST',
      headers: provider.headers(key),
      body:    provider.buildBody(
        [{ role: 'user', content: 'Hello' }],
        'Say hi briefly.',
        provider.model
      ),
    });
    res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Send & Stream ────────────────────────────────────────────────────────────

async function _handleSend() {
  if (_isStreaming) return;

  const prompt = document.getElementById('ai-prompt')?.value.trim();
  if (!prompt) return;

  if (!_keys[_activeId]) {
    document.getElementById('ai-settings')?.setAttribute('open', '');
    document.getElementById('ai-key-input')?.focus();
    return;
  }

  const provider = PROVIDERS[_activeId];
  const key      = _keys[_activeId];
  const ctx      = _buildContext();

  _startStreaming();

  try {
    const res = await fetch(provider.endpoint(key, provider.model), {
      method:  'POST',
      headers: provider.headers(key),
      body:    provider.buildBody(
        [{ role: 'user', content: _buildUserMessage(prompt, ctx) }],
        _buildSystemPrompt(ctx),
        provider.model
      ),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      _showError(err?.error?.message || `API error ${res.status}`);
      _stopStreaming();
      return;
    }

    await _streamSSE(res.body, provider);
    _stopStreaming();
  } catch (e) {
    _showError(e.message);
    _stopStreaming();
  }
}

async function _streamSSE(body, provider) {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

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
          const ev   = JSON.parse(json);
          const text = provider.extractChunk(ev);
          if (text) _onChunk(text);
          if (provider.isDone(ev)) return;
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
  if (responseEl) { responseEl.textContent = ''; responseEl.className = 'ai-response streaming'; }
  if (sendBtn)    { sendBtn.disabled = true; sendBtn.textContent = 'Generating…'; }

  _onChunk = text => {
    _lastResponse += text;
    if (responseEl) {
      responseEl.textContent = _lastResponse;
      responseEl.scrollTop   = responseEl.scrollHeight;
    }
  };
}

function _stopStreaming() {
  _isStreaming = false;
  document.getElementById('ai-response')?.classList.remove('streaming');
  const sendBtn = document.getElementById('btn-ai-send');
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11zM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493z"/></svg> Send`;
  }
}

function _showError(message) {
  const responseEl = document.getElementById('ai-response');
  if (responseEl) { responseEl.textContent = `Error: ${message}`; responseEl.className = 'ai-response error'; }
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
  text.split('\n').filter(l => l.trim()).forEach((line, i) => {
    if (i > 0) document.execCommand('insertParagraph');
    document.execCommand('insertText', false, line);
  });
}
