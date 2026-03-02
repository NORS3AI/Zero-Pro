// ai.js — Free AI writing assistant sidebar (powered by Pollinations.ai)

// ─── Provider ────────────────────────────────────────────────────────────────

const PROVIDER = {
  name:     'ChatGPT (Free)',
  model:    'openai',
  endpoint: 'https://text.pollinations.ai/openai',

  headers: () => ({ 'content-type': 'application/json' }),

  buildBody: (messages, system, model) => JSON.stringify({
    model, stream: true,
    messages: [{ role: 'system', content: system }, ...messages],
  }),

  extractChunk: ev => ev.choices?.[0]?.delta?.content ?? null,

  isDone: ev => ev.choices?.[0]?.finish_reason === 'stop',
};

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

/**
 * One-shot text generation (non-streaming).
 * Returns the generated text string, or throws on error.
 * @param {string} systemPrompt — system-level instruction
 * @param {string} userPrompt   — user message
 * @returns {Promise<string>}
 */
export async function generateText(systemPrompt, userPrompt) {
  const messages = [{ role: 'user', content: userPrompt }];
  const bodyStr  = PROVIDER.buildBody(messages, systemPrompt, PROVIDER.model);
  const body     = JSON.parse(bodyStr);
  body.stream     = false;
  if (body.max_tokens == null) body.max_tokens = 1024;

  const res = await fetch(PROVIDER.endpoint, {
    method:  'POST',
    headers: PROVIDER.headers(),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── UI Construction ──────────────────────────────────────────────────────────

function _buildUI() {
  const panel = document.getElementById('ai-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div id="ai-header">
      <span class="ai-title">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm.5 12.5h-1v-5h1v5zm0-6.5h-1V4.5h1V6z"/></svg>
        Ask ${PROVIDER.name}
      </span>
      <button class="ai-close-btn" id="btn-ai-close" title="Close" aria-label="Close AI panel">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/></svg>
      </button>
    </div>

    <div id="ai-body">

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

    </div><!-- /ai-body -->
  `;

  _bindEvents();
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

  // Refresh context when panel opens
  const workspace = document.getElementById('workspace');
  if (workspace) {
    new MutationObserver(() => {
      if (workspace.classList.contains('ai-open')) _refreshContextLabel();
    }).observe(workspace, { attributes: true, attributeFilter: ['class'] });
  }
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
      excerpt = text.length > 3000 ? text.slice(0, 3000) + "\u2026" : text;
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

// ─── Send & Stream ────────────────────────────────────────────────────────────

async function _handleSend() {
  if (_isStreaming) return;

  const prompt = document.getElementById('ai-prompt')?.value.trim();
  if (!prompt) return;

  const ctx = _buildContext();
  _startStreaming();

  try {
    const res = await fetch(PROVIDER.endpoint, {
      method:  'POST',
      headers: PROVIDER.headers(),
      body:    PROVIDER.buildBody(
        [{ role: 'user', content: _buildUserMessage(prompt, ctx) }],
        _buildSystemPrompt(ctx),
        PROVIDER.model
      ),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      _showError(err?.error?.message || `API error ${res.status}`);
      _stopStreaming();
      return;
    }

    await _streamSSE(res.body);
    _stopStreaming();
  } catch (e) {
    _showError(e.message);
    _stopStreaming();
  }
}

async function _streamSSE(body) {
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
          const text = PROVIDER.extractChunk(ev);
          if (text) _onChunk(text);
          if (PROVIDER.isDone(ev)) return;
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
  if (sendBtn)    { sendBtn.disabled = true; sendBtn.textContent = 'Generating\u2026'; }

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
