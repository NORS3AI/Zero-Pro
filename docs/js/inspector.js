// inspector.js — Document & project metadata inspector panel
// Phase 2: The Corkboard & Structure

import { updateDocument, saveProject, getProjectWordCount } from './storage.js';
import { LABEL_COLORS } from './corkboard.js';

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
          <label class="inspector-label" for="insp-synopsis">Synopsis</label>
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

        <div class="editing-score-header">
          <div class="editing-ring-wrap">
            <svg class="editing-ring-svg" viewBox="0 0 56 56" aria-hidden="true">
              <circle class="editing-ring-track" cx="28" cy="28" r="22"/>
              <circle class="editing-ring-fill"  cx="28" cy="28" r="22"/>
            </svg>
            <span class="editing-ring-label">—</span>
          </div>
          <div class="editing-score-meta">
            <div class="editing-score-title">Writing Score</div>
            <div class="editing-score-sub">Analyse to reveal your score</div>
          </div>
        </div>

        <div class="editing-cta-wrap">
          <button class="editing-cta-btn" disabled title="Coming soon — AI-powered writing analysis">
            <span>Analyse Writing</span>
            <span class="editing-soon-badge">Coming Soon</span>
          </button>
        </div>

        <div class="editing-cat-list" id="editing-cat-list"></div>

        <p class="editing-note">
          Professional editing analysis — grammar, style, readability,
          pacing, consistency, and dialogue checks. Powered by AI,
          inspired by ProWritingAid.
        </p>

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
