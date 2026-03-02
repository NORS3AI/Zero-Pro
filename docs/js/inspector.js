// inspector.js — Document & project metadata inspector panel
// Phase 2: The Corkboard & Structure / Phase 10: AI readability + writing analysis

import { updateDocument, saveProject, getProjectWordCount } from './storage.js';
import { LABEL_COLORS } from './corkboard.js';
import { analyzeReadability, readabilityLabel, analyzeWithAI, htmlToPlainText } from './ai-analysis.js';
import { generateText } from './ai.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'draft',       label: 'Draft'       },
  { value: 'revised',     label: 'Revised'     },
  { value: 'final',       label: 'Final'       },
];

const LABELS = [
  { value: '',       label: '— None'  },
  { value: 'red',    label: 'Red'     },
  { value: 'orange', label: 'Orange'  },
  { value: 'yellow', label: 'Yellow'  },
  { value: 'green',  label: 'Green'   },
  { value: 'blue',   label: 'Blue'    },
  { value: 'purple', label: 'Purple'  },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _project         = null;
let _doc             = null;
let _onDocChange     = null;
let _onProjectChange = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build the inspector UI and wire events. Call once at app init.
 * @param {{ onDocChange: Function, onProjectChange: Function }} opts
 */
export function initInspector({ onDocChange, onProjectChange }) {
  _onDocChange     = onDocChange;
  _onProjectChange = onProjectChange;
  _buildUI();
}

/**
 * Populate inspector fields for the given document.
 * Pass null for doc to show the empty state.
 * @param {Object} project
 * @param {Object|null} doc
 */
export function updateInspector(project, doc) {
  _project = project;
  _doc     = doc;
  _populateDocTab();
  _populateProjectTab();
  _populateEditingTab();
}

// ─── UI Construction ──────────────────────────────────────────────────────────

function _buildUI() {
  const content = document.getElementById('inspector-content');
  if (!content) return;

  content.innerHTML = `
    <div class="inspector-tabs" role="tablist" aria-label="Inspector tabs">
      <button class="inspector-tab active" role="tab" data-tab="doc"
              aria-selected="true"  aria-controls="inspector-doc-tab">Document</button>
      <button class="inspector-tab"        role="tab" data-tab="project"
              aria-selected="false" aria-controls="inspector-project-tab">Project</button>
      <button class="inspector-tab"        role="tab" data-tab="editing"
              aria-selected="false" aria-controls="inspector-editing-tab">Editing</button>
    </div>

    <!-- Document tab -->
    <div id="inspector-doc-tab" class="inspector-panel active" role="tabpanel">
      <div id="inspector-no-doc" class="inspector-empty">
        Select a document to view its details.
      </div>
      <div id="inspector-doc-fields" class="inspector-fields hidden">

        <!-- Word & character count stats -->
        <div class="insp-stats-grid">
          <div class="insp-stat-cell">
            <span id="insp-word-count" class="insp-stat-value">—</span>
            <span class="insp-stat-name">Words</span>
          </div>
          <div class="insp-stat-cell">
            <span id="insp-char-count" class="insp-stat-value">—</span>
            <span class="insp-stat-name">Chars</span>
          </div>
        </div>

        <div class="inspector-field">
          <div class="inspector-label-row" style="justify-content:space-between">
            <label class="inspector-label" for="insp-synopsis">Synopsis</label>
            <button id="btn-auto-synopsis" class="inspector-auto-btn"
                    title="Generate synopsis with AI" aria-label="Auto-generate synopsis">
              <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.116l.094-.318z"/></svg>
              <span>Auto</span>
            </button>
          </div>
          <textarea id="insp-synopsis" class="inspector-textarea" rows="4"
                    placeholder="A brief summary of this scene…"></textarea>
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-status">Status</label>
          <select id="insp-status" class="inspector-select"></select>
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-label">Label</label>
          <div class="inspector-label-row">
            <span id="insp-label-swatch" class="inspector-label-swatch"></span>
            <select id="insp-label" class="inspector-select"></select>
          </div>
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-pov">POV Character</label>
          <input id="insp-pov" type="text" class="inspector-input"
                 placeholder="Character name…">
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-location">Location</label>
          <input id="insp-location" type="text" class="inspector-input"
                 placeholder="Scene location…">
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-keywords">Keywords</label>
          <input id="insp-keywords" type="text" class="inspector-input"
                 placeholder="Comma-separated tags…">
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-date">Scene Date</label>
          <input id="insp-date" type="text" class="inspector-input"
                 placeholder="e.g. March 1st, 1843 or Day 14…">
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-duration">Scene Duration</label>
          <input id="insp-duration" type="text" class="inspector-input"
                 placeholder="e.g. 2 hours, 3 days…">
        </div>

        <div class="inspector-field">
          <label class="inspector-label" for="insp-target">Word Count Target</label>
          <input id="insp-target" type="number" class="inspector-input"
                 placeholder="0" min="0" step="100">
          <div class="target-progress-wrap" id="insp-target-wrap" hidden>
            <div class="target-progress-bar" id="insp-target-bar"></div>
          </div>
          <div class="target-progress-label" id="insp-target-label"></div>
        </div>

      </div>
    </div>

    <!-- Project tab -->
    <div id="inspector-project-tab" class="inspector-panel hidden" role="tabpanel">
      <div class="inspector-fields">

        <div class="inspector-field">
          <label class="inspector-label">Total Words</label>
          <div id="insp-proj-total" class="inspector-stat">—</div>
        </div>

        <div class="inspector-field">
          <label class="inspector-label">Documents</label>
          <div id="insp-proj-docs" class="inspector-stat">—</div>
        </div>

        <div class="inspector-field">
          <label class="inspector-label">Folders</label>
          <div id="insp-proj-folders" class="inspector-stat">—</div>
        </div>

        <div class="inspector-field">
          <label class="inspector-label">Created</label>
          <div id="insp-proj-created" class="inspector-stat">—</div>
        </div>

        <div class="inspector-field">
          <label class="inspector-label">Last Modified</label>
          <div id="insp-proj-updated" class="inspector-stat">—</div>
        </div>

      </div>
    </div>

    <!-- Editing tab -->
    <div id="inspector-editing-tab" class="inspector-panel hidden" role="tabpanel">
      <div id="editing-no-doc" class="inspector-empty">
        Select a document to view editing suggestions.
      </div>
      <div id="editing-doc-content" class="hidden">

        <!-- Readability card (Phase 10 — calculated locally) -->
        <div class="readability-card" id="readability-card">
          <div class="readability-card-header">
            <span class="readability-card-label">Readability</span>
            <span class="readability-grade" id="readability-grade">—</span>
          </div>
          <div class="readability-score" id="readability-score">—</div>
          <div class="readability-bar-track">
            <div class="readability-bar" id="readability-bar" style="width:0%"></div>
          </div>
          <div class="readability-desc" id="readability-desc">Open a document to see its reading level.</div>
          <div class="readability-stats" id="readability-stats"></div>
        </div>

        <!-- AI tone + style analysis (uses whichever provider is active) -->
        <div class="editing-cta-wrap">
          <button class="editing-cta-btn" id="btn-analyze-ai"
                  title="Analyze tone and style with AI (requires an API key)">
            <span id="analyze-ai-label">Analyze Writing (AI)</span>
          </button>
        </div>

        <!-- AI results appear here -->
        <div id="ai-analysis-results" class="hidden">
          <div class="ai-tone-row">
            <span class="ai-tone-label">Tone</span>
            <span class="ai-tone-value" id="ai-tone-value">—</span>
          </div>
          <div id="ai-suggestions-list"></div>
        </div>

        <div class="editing-cat-list" id="editing-cat-list"></div>

        <p class="editing-note">
          Readability is calculated locally. AI features (tone analysis, auto-synopsis)
          need an API key for Claude, ChatGPT, or Gemini.
        </p>
        <button class="editing-setup-btn" id="btn-open-ai-setup"
                title="Open the AI panel to set up your API key">
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.793.793 1.025-1.025-1.5-1.5H7.163a.5.5 0 0 1-.45-.285A3 3 0 0 0 4 5z"/><path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
          Set Up API Key
        </button>

      </div>
    </div>
  `;

  // Build editing category rows
  const EDITING_CATS = [
    { icon: '✓', name: 'Grammar',     hint: 'Errors & corrections' },
    { icon: '◈', name: 'Style',       hint: 'Improvements & clarity' },
    { icon: '◎', name: 'Readability', hint: 'Flesch-Kincaid level' },
    { icon: '▸', name: 'Pacing',      hint: 'Scene rhythm & tension' },
    { icon: '⟳', name: 'Consistency', hint: 'Names, facts, repetition' },
    { icon: '❝', name: 'Dialogue',    hint: 'Tags & punctuation' },
  ];
  const catList = document.getElementById('editing-cat-list');
  if (catList) {
    EDITING_CATS.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'editing-cat-row';

      const iconEl = document.createElement('span');
      iconEl.className   = 'editing-cat-icon';
      iconEl.textContent = cat.icon;
      iconEl.setAttribute('aria-hidden', 'true');

      const bodyEl = document.createElement('span');
      bodyEl.className = 'editing-cat-body';
      bodyEl.innerHTML = `<span class="editing-cat-name">${cat.name}</span>
                          <span class="editing-cat-hint">${cat.hint}</span>`;

      const scoreEl = document.createElement('span');
      scoreEl.className   = 'editing-cat-score';
      scoreEl.textContent = '—';

      row.appendChild(iconEl);
      row.appendChild(bodyEl);
      row.appendChild(scoreEl);
      catList.appendChild(row);
    });
  }

  // Populate status <select>
  const statusSel = document.getElementById('insp-status');
  STATUSES.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    statusSel?.appendChild(opt);
  });

  // Populate label <select>
  const labelSel = document.getElementById('insp-label');
  LABELS.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    labelSel?.appendChild(opt);
  });

  _bindTabs();
  _bindFields();
}

function _bindTabs() {
  const content = document.getElementById('inspector-content');
  if (!content) return;

  content.addEventListener('click', e => {
    const tab = e.target.closest('.inspector-tab');
    if (!tab) return;

    const name = tab.dataset.tab;
    content.querySelectorAll('.inspector-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
      t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false');
    });
    content.querySelectorAll('.inspector-panel').forEach(p => {
      const match = p.id === `inspector-${name}-tab`;
      p.classList.toggle('active', match);
      p.classList.toggle('hidden', !match);
    });
  });
}

function _bindFields() {
  // Textarea — save on input (debounced via storage)
  _on('insp-synopsis', 'input', () => _save('synopsis', _val('insp-synopsis')));

  // Auto-generate synopsis with AI
  document.getElementById('btn-auto-synopsis')?.addEventListener('click', _autoSynopsis);

  // Selects — save on change
  _on('insp-status', 'change', () => _save('status', _val('insp-status')));
  _on('insp-label', 'change', () => {
    const label = _val('insp-label') || null;
    _save('label', label);
    _updateLabelSwatch(label);
  });

  // Text inputs — save on change (blur/enter)
  _on('insp-pov',      'change', () => _save('pov',      _val('insp-pov')));
  _on('insp-location', 'change', () => _save('location', _val('insp-location')));
  _on('insp-keywords', 'change', () => _save('keywords', _val('insp-keywords')));
  _on('insp-date',     'change', () => _save('date',     _val('insp-date')));
  _on('insp-duration', 'change', () => _save('duration', _val('insp-duration')));

  // Target word count
  _on('insp-target', 'change', () => {
    const val = parseInt(_val('insp-target'), 10) || 0;
    _save('target', val);
    _updateTargetProgress();
  });
}

// ─── Population ───────────────────────────────────────────────────────────────

function _populateDocTab() {
  const noDoc = document.getElementById('inspector-no-doc');
  const fields = document.getElementById('inspector-doc-fields');

  if (!_doc || _doc.type !== 'doc') {
    noDoc?.classList.remove('hidden');
    fields?.classList.add('hidden');
    return;
  }

  noDoc?.classList.add('hidden');
  fields?.classList.remove('hidden');

  // Word count & character count stats
  const wc    = _doc.wordCount || 0;
  const chars = _charCount(_doc.content);
  _setText('insp-word-count', wc.toLocaleString());
  _setText('insp-char-count', chars.toLocaleString());

  _setVal('insp-synopsis', _doc.synopsis || '');
  _setVal('insp-status',   _doc.status   || 'draft');
  _setVal('insp-label',    _doc.label    || '');
  _setVal('insp-pov',      _doc.pov      || '');
  _setVal('insp-location', _doc.location || '');
  _setVal('insp-keywords', _doc.keywords || '');
  _setVal('insp-date',     _doc.date     || '');
  _setVal('insp-duration', _doc.duration || '');
  _setVal('insp-target',   _doc.target   || 0);

  _updateLabelSwatch(_doc.label || null);
  _updateTargetProgress();
}

function _populateProjectTab() {
  if (!_project) return;

  const total      = getProjectWordCount(_project);
  const docCount   = _project.documents.filter(d => !d.inTrash && d.type === 'doc').length;
  const folderCount = _project.documents.filter(d => !d.inTrash && d.type === 'folder').length;

  _setText('insp-proj-total',   `${total.toLocaleString()} words`);
  _setText('insp-proj-docs',    `${docCount}`);
  _setText('insp-proj-folders', `${folderCount}`);
  _setText('insp-proj-created', _fmtDate(_project.createdAt));
  _setText('insp-proj-updated', _fmtDate(_project.updatedAt));
}

function _updateLabelSwatch(label) {
  const swatch = document.getElementById('insp-label-swatch');
  if (!swatch) return;
  const color = (label && LABEL_COLORS[label]) ? LABEL_COLORS[label] : null;
  swatch.style.background = color || 'transparent';
  swatch.style.border = color ? 'none' : '1px dashed var(--border)';
}

function _updateTargetProgress() {
  const wrap  = document.getElementById('insp-target-wrap');
  const bar   = document.getElementById('insp-target-bar');
  const label = document.getElementById('insp-target-label');
  if (!wrap || !bar || !label) return;

  const target = _doc?.target || 0;
  const count  = _doc?.wordCount || 0;

  if (!target) {
    wrap.hidden = true;
    label.textContent = '';
    return;
  }

  const pct = Math.min(100, Math.round((count / target) * 100));
  wrap.hidden = false;
  bar.style.width = `${pct}%`;
  bar.style.background = pct >= 100 ? 'var(--green)' : 'var(--accent)';
  label.textContent = `${count.toLocaleString()} / ${target.toLocaleString()} words (${pct}%)`;
}

function _populateEditingTab() {
  const noDoc  = document.getElementById('editing-no-doc');
  const docEl  = document.getElementById('editing-doc-content');
  const hasDoc = !!(_doc && _doc.type === 'doc');
  noDoc?.classList.toggle('hidden',  hasDoc);
  docEl?.classList.toggle('hidden', !hasDoc);

  if (!hasDoc) return;

  // ── Flesch-Kincaid readability (local, instant) ──────────────────────────
  const plain   = htmlToPlainText(_doc.content || '');
  const reading = analyzeReadability(plain);

  const scoreEl = document.getElementById('readability-score');
  const gradeEl = document.getElementById('readability-grade');
  const barEl   = document.getElementById('readability-bar');
  const descEl  = document.getElementById('readability-desc');
  const statsEl = document.getElementById('readability-stats');

  if (scoreEl) { scoreEl.textContent = reading.score; scoreEl.style.color = reading.color; }
  if (gradeEl)   gradeEl.textContent  = reading.grade;
  if (barEl)   { barEl.style.width = `${reading.score}%`; barEl.style.background = reading.color; }
  if (descEl)    descEl.textContent   = readabilityLabel(reading.score);
  if (statsEl)   statsEl.innerHTML    = reading.words
    ? `${reading.sentences} sentences &bull; ${reading.words} words &bull; avg ${reading.avgSentLen} words/sentence`
    : '';

  // ── AI analysis button ────────────────────────────────────────────────────
  const aiBtn    = document.getElementById('btn-analyze-ai');
  const aiLabel  = document.getElementById('analyze-ai-label');
  const aiResult = document.getElementById('ai-analysis-results');

  // Re-wire button (remove old listeners by cloning)
  if (aiBtn) {
    const fresh = aiBtn.cloneNode(true);
    aiBtn.replaceWith(fresh);
    fresh.addEventListener('click', async () => {
      const lbl = document.getElementById('analyze-ai-label');
      if (lbl) lbl.textContent = 'Analyzing…';
      fresh.disabled = true;
      document.getElementById('ai-analysis-results')?.classList.add('hidden');

      try {
        const excerpt = plain.slice(0, 3000);
        const raw = await generateText(
          "You are a writing analyst. Respond with ONLY valid JSON.",
          `Analyze this passage from "${_doc.title || 'untitled'}".\n\nRespond in this exact JSON format:\n{"tone":"one short phrase","suggestions":["Suggestion 1","Suggestion 2","Suggestion 3"]}\n\nPassage:\n${excerpt}`
        );
        const match = raw.match(/\{[\s\S]*\}/);
        const result = match ? JSON.parse(match[0]) : { tone: 'unknown', suggestions: [raw.slice(0, 200)] };
        _showAiResults(result);
      } catch (err) {
        import('./ui.js').then(({ showToast }) => showToast(err.message));
      } finally {
        if (lbl) lbl.textContent = 'Analyze Writing (AI)';
        fresh.disabled = false;
      }
    });
  }

  // "Set Up API Key" button → open AI panel with Settings expanded
  const setupBtn = document.getElementById('btn-open-ai-setup');
  if (setupBtn) {
    const fresh = setupBtn.cloneNode(true);
    setupBtn.replaceWith(fresh);
    fresh.addEventListener('click', () => {
      import('./ai.js').then(({ toggleAIPanel }) => {
        const ws = document.getElementById('workspace');
        if (!ws?.classList.contains('ai-open')) toggleAIPanel();
        // Open the Settings details
        setTimeout(() => {
          const details = document.getElementById('ai-settings');
          if (details) details.open = true;
        }, 200);
      });
    });
  }
}

function _showAiResults({ tone, suggestions }) {
  const toneEl = document.getElementById('ai-tone-value');
  const listEl = document.getElementById('ai-suggestions-list');
  const wrap   = document.getElementById('ai-analysis-results');

  if (toneEl)  toneEl.textContent = tone || '—';
  if (listEl) {
    listEl.innerHTML = (suggestions || []).map(s =>
      `<div class="ai-suggestion">${_esc(s)}</div>`
    ).join('');
  }
  wrap?.classList.remove('hidden');
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Auto-Synopsis ───────────────────────────────────────────────────────────

async function _autoSynopsis() {
  if (!_doc) return;
  const btn = document.getElementById('btn-auto-synopsis');
  const textarea = document.getElementById('insp-synopsis');
  if (!btn || !textarea) return;

  const text = htmlToPlainText(_doc.content || '');
  if (!text) { textarea.placeholder = 'Write something first so AI can summarise it.'; return; }

  btn.disabled = true;
  const orig = btn.innerHTML;
  btn.textContent = '...';

  try {
    const excerpt = text.slice(0, 3000);
    const result = await generateText(
      "You are a writing assistant. Write a brief 1-2 sentence synopsis of the scene. Be concise and capture the key events and emotional beats. Return ONLY the synopsis text, no labels or prefixes.",
      `Scene title: "${_doc.title || 'Untitled'}"\n\n${excerpt}`
    );
    const synopsis = result.trim();
    if (synopsis) {
      textarea.value = synopsis;
      _save('synopsis', synopsis);
    }
  } catch (err) {
    textarea.placeholder = err.message;
    setTimeout(() => { textarea.placeholder = "A brief summary of this scene\u2026"; }, 4000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _save(key, value) {
  if (!_project || !_doc) return;
  updateDocument(_project, _doc.id, { [key]: value });
  _doc[key] = value;
  saveProject(_project);
  _onDocChange?.(_project, _doc);
}

function _on(id, event, handler) {
  document.getElementById(id)?.addEventListener(event, handler);
}

function _val(id) {
  return document.getElementById(id)?.value ?? '';
}

function _setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/** Count visible characters (no whitespace) from HTML content */
function _charCount(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.innerText || tmp.textContent || '').replace(/\s/g, '').length;
}
