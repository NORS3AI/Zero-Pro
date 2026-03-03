// inspector.js — Document & project metadata inspector panel
// Phase 2: The Corkboard & Structure / Phase 10: AI readability + writing analysis

import { updateDocument, saveProject, getProjectWordCount } from './storage.js';
import { LABEL_COLORS } from './corkboard.js';
import { analyzeReadability, readabilityLabel, readabilityScale, htmlToPlainText } from './ai-analysis.js';
import { generateText } from './ai.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'draft',       label: 'Draft'       },
  { value: 'revised',     label: 'Revised'     },
  { value: 'final',       label: 'Final'       },
];

const LABELS = [
  { value: '',       label: '\u2014 None'  },
  { value: 'red',    label: 'Red'     },
  { value: 'orange', label: 'Orange'  },
  { value: 'yellow', label: 'Yellow'  },
  { value: 'green',  label: 'Green'   },
  { value: 'blue',   label: 'Blue'    },
  { value: 'purple', label: 'Purple'  },
];

const EDITING_CATS = [
  { id: 'grammar',     icon: '\u2713', name: 'Grammar',     hint: 'Errors & corrections' },
  { id: 'style',       icon: '\u25C8', name: 'Style',       hint: 'Improvements & clarity' },
  { id: 'readability', icon: '\u25CE', name: 'Readability', hint: 'Flesch-Kincaid level' },
  { id: 'pacing',      icon: '\u25B8', name: 'Pacing',      hint: 'Scene rhythm & tension' },
  { id: 'consistency', icon: '\u27F3', name: 'Consistency', hint: 'Names, facts, repetition' },
  { id: 'dialogue',    icon: '\u275D', name: 'Dialogue',    hint: 'Tags & punctuation' },
];

const GENRES = [
  '', 'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Fantasy Romance', 'Dark Fantasy', 'Urban Fantasy', 'Dystopian',
  'Contemporary', 'Memoir', 'Poetry', 'Screenplay',
];

// ─── State ────────────────────────────────────────────────────────────────────

let _project         = null;
let _doc             = null;
let _onDocChange     = null;
let _onProjectChange = null;
let _lastAnalysis    = null;   // cached AI analysis result for drill-down
let _lastPlainText   = '';     // cached plain text of current doc

// ─── Public API ───────────────────────────────────────────────────────────────

export function initInspector({ onDocChange, onProjectChange }) {
  _onDocChange     = onDocChange;
  _onProjectChange = onProjectChange;
  _buildUI();
}

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
        <div class="insp-stats-grid">
          <div class="insp-stat-cell">
            <span id="insp-word-count" class="insp-stat-value">\u2014</span>
            <span class="insp-stat-name">Words</span>
          </div>
          <div class="insp-stat-cell">
            <span id="insp-char-count" class="insp-stat-value">\u2014</span>
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
          <textarea id="insp-synopsis" class="inspector-textarea" rows="8"
                    placeholder="A detailed synopsis of this scene\u2026"></textarea>
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
          <input id="insp-pov" type="text" class="inspector-input" placeholder="Character name\u2026">
        </div>
        <div class="inspector-field">
          <label class="inspector-label" for="insp-location">Location</label>
          <input id="insp-location" type="text" class="inspector-input" placeholder="Scene location\u2026">
        </div>
        <div class="inspector-field">
          <label class="inspector-label" for="insp-keywords">Keywords</label>
          <input id="insp-keywords" type="text" class="inspector-input" placeholder="Comma-separated tags\u2026">
        </div>
        <div class="inspector-field">
          <label class="inspector-label" for="insp-date">Scene Date</label>
          <input id="insp-date" type="text" class="inspector-input" placeholder="e.g. March 1st, 1843 or Day 14\u2026">
        </div>
        <div class="inspector-field">
          <label class="inspector-label" for="insp-duration">Scene Duration</label>
          <input id="insp-duration" type="text" class="inspector-input" placeholder="e.g. 2 hours, 3 days\u2026">
        </div>
        <div class="inspector-field">
          <label class="inspector-label" for="insp-target">Word Count Target</label>
          <input id="insp-target" type="number" class="inspector-input" placeholder="0" min="0" step="100">
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
          <div id="insp-proj-total" class="inspector-stat">\u2014</div>
        </div>
        <div class="inspector-field">
          <label class="inspector-label">Documents</label>
          <div id="insp-proj-docs" class="inspector-stat">\u2014</div>
        </div>
        <div class="inspector-field">
          <label class="inspector-label">Folders</label>
          <div id="insp-proj-folders" class="inspector-stat">\u2014</div>
        </div>
        <div class="inspector-field">
          <label class="inspector-label">Created</label>
          <div id="insp-proj-created" class="inspector-stat">\u2014</div>
        </div>
        <div class="inspector-field">
          <label class="inspector-label">Last Modified</label>
          <div id="insp-proj-updated" class="inspector-stat">\u2014</div>
        </div>
      </div>
    </div>

    <!-- Editing tab -->
    <div id="inspector-editing-tab" class="inspector-panel hidden" role="tabpanel">
      <div id="editing-no-doc" class="inspector-empty">
        Select a document to view editing suggestions.
      </div>
      <div id="editing-doc-content" class="hidden">

        <!-- Genre / style selector -->
        <div class="editing-genre-wrap">
          <label class="inspector-label" for="insp-genre">Document Style / Genre</label>
          <select id="insp-genre" class="inspector-select">
            <option value="">\u2014 General</option>
            ${GENRES.filter(g => g).map(g => `<option value="${g}">${g}</option>`).join('')}
          </select>
        </div>

        <!-- Readability card -->
        <div class="readability-card" id="readability-card">
          <div class="readability-card-header">
            <span class="readability-card-label">Readability</span>
            <span class="readability-grade" id="readability-grade">\u2014</span>
          </div>
          <div class="readability-score readability-score-tap" id="readability-score"
               role="button" tabindex="0"
               title="Tap to see the readability scale"
               aria-label="Readability score \u2014 tap for reference scale">\u2014</div>
          <div class="readability-bar-track">
            <div class="readability-bar" id="readability-bar" style="width:0%"></div>
          </div>
          <div class="readability-desc" id="readability-desc">Open a document to see its reading level.</div>
          <div class="readability-stats" id="readability-stats"></div>
        </div>

        <!-- Readability reference popup -->
        <div id="readability-ref-popup" class="readability-ref-popup hidden" role="dialog" aria-label="Readability scale reference">
          <div class="readability-ref-header">
            <span class="readability-ref-title">Flesch Reading Ease Scale</span>
            <button class="readability-ref-close" id="readability-ref-close" aria-label="Close">&times;</button>
          </div>
          <div class="readability-ref-body" id="readability-ref-body"></div>
          <div class="readability-ref-footer">
            <span class="readability-ref-your">Your score: <strong id="readability-ref-your-score">\u2014</strong></span>
          </div>
        </div>

        <!-- AI analysis button -->
        <div class="editing-cta-wrap">
          <button class="editing-cta-btn" id="btn-analyze-ai" title="Analyze writing with AI">
            <span id="analyze-ai-label">Analyze Writing (AI)</span>
          </button>
        </div>

        <!-- AI results -->
        <div id="ai-analysis-results" class="hidden">
          <!-- Clickable tone badge -->
          <div class="ai-tone-row">
            <span class="ai-tone-label">Tone</span>
            <span class="ai-tone-value ai-tone-clickable" id="ai-tone-value"
                  role="button" tabindex="0" title="Click for details">\u2014</span>
          </div>
          <!-- Tone detail panel (hidden) -->
          <div id="ai-tone-detail" class="ai-detail-panel hidden">
            <div class="ai-detail-header">
              <span class="ai-detail-title">Tone Analysis</span>
              <button class="ai-detail-close" data-close="ai-tone-detail" aria-label="Close">&times;</button>
            </div>
            <div class="ai-detail-body" id="ai-tone-detail-body">Loading\u2026</div>
          </div>
          <div id="ai-suggestions-list"></div>
        </div>

        <!-- Category rows (clickable for drill-down) -->
        <div class="editing-cat-list" id="editing-cat-list"></div>

        <!-- Category detail panel (shown when a category is clicked) -->
        <div id="ai-cat-detail" class="ai-detail-panel hidden">
          <div class="ai-detail-header">
            <span class="ai-detail-title" id="ai-cat-detail-title">Category</span>
            <button class="ai-detail-close" data-close="ai-cat-detail" aria-label="Close">&times;</button>
          </div>
          <div class="ai-detail-body" id="ai-cat-detail-body">Click "Analyze Writing" first.</div>
        </div>

        <p class="editing-note">
          Readability is calculated locally. AI analysis uses the free ChatGPT provider \u2014 no API key needed.
          Click any category after analysis for in-depth feedback.
        </p>
      </div>
    </div>
  `;

  // Build editing category rows
  const catList = document.getElementById('editing-cat-list');
  if (catList) {
    EDITING_CATS.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'editing-cat-row editing-cat-clickable';
      row.dataset.cat = cat.id;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.title = `Click for in-depth ${cat.name} analysis`;

      const iconEl = document.createElement('span');
      iconEl.className   = 'editing-cat-icon';
      iconEl.textContent = cat.icon;
      iconEl.setAttribute('aria-hidden', 'true');

      const bodyEl = document.createElement('span');
      bodyEl.className = 'editing-cat-body';
      bodyEl.innerHTML = `<span class="editing-cat-name">${cat.name}</span>
                          <span class="editing-cat-hint" data-cat-hint="${cat.id}">${cat.hint}</span>`;

      const scoreEl = document.createElement('span');
      scoreEl.className   = 'editing-cat-score';
      scoreEl.dataset.catScore = cat.id;
      scoreEl.textContent = '\u2014';

      const chevron = document.createElement('span');
      chevron.className = 'editing-cat-chevron';
      chevron.textContent = '\u203A';

      row.appendChild(iconEl);
      row.appendChild(bodyEl);
      row.appendChild(scoreEl);
      row.appendChild(chevron);
      catList.appendChild(row);
    });
  }

  _buildReadabilityRefBody();

  // Populate status <select>
  const statusSel = document.getElementById('insp-status');
  STATUSES.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value; opt.textContent = label;
    statusSel?.appendChild(opt);
  });

  // Populate label <select>
  const labelSel = document.getElementById('insp-label');
  LABELS.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value; opt.textContent = label;
    labelSel?.appendChild(opt);
  });

  _bindTabs();
  _bindFields();
  _bindReadabilityPopup();
  _bindCategoryClicks();
  _bindToneClick();
  _bindDetailCloseButtons();
  _bindGenreSelector();
}

function _buildReadabilityRefBody() {
  const body = document.getElementById('readability-ref-body');
  if (!body) return;
  const scale = readabilityScale();
  body.innerHTML = scale.map(s =>
    `<div class="readability-ref-row">
       <span class="readability-ref-dot" style="background:${s.color}"></span>
       <span class="readability-ref-range">${s.range}</span>
       <span class="readability-ref-grade">${s.grade}</span>
       <span class="readability-ref-desc">${s.desc}</span>
     </div>`
  ).join('');
}

function _bindReadabilityPopup() {
  const scoreEl = document.getElementById('readability-score');
  const popup   = document.getElementById('readability-ref-popup');
  const closeBtn = document.getElementById('readability-ref-close');

  if (scoreEl && popup) {
    const toggle = () => {
      const isHidden = popup.classList.contains('hidden');
      popup.classList.toggle('hidden', !isHidden);
      const yourEl = document.getElementById('readability-ref-your-score');
      if (yourEl) yourEl.textContent = scoreEl.textContent;
    };
    scoreEl.addEventListener('click', toggle);
    scoreEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }
  closeBtn?.addEventListener('click', () => popup?.classList.add('hidden'));
}

function _bindCategoryClicks() {
  const catList = document.getElementById('editing-cat-list');
  if (!catList) return;
  catList.addEventListener('click', e => {
    const row = e.target.closest('.editing-cat-row');
    if (!row) return;
    _showCategoryDetail(row.dataset.cat);
  });
  catList.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const row = e.target.closest('.editing-cat-row');
      if (row) _showCategoryDetail(row.dataset.cat);
    }
  });
}

function _bindToneClick() {
  const toneEl = document.getElementById('ai-tone-value');
  if (!toneEl) return;
  const handler = () => _showToneDetail();
  toneEl.addEventListener('click', handler);
  toneEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
  });
}

function _bindDetailCloseButtons() {
  document.querySelectorAll('.ai-detail-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.close;
      if (targetId) document.getElementById(targetId)?.classList.add('hidden');
    });
  });
}

function _bindGenreSelector() {
  const sel = document.getElementById('insp-genre');
  if (!sel) return;
  sel.addEventListener('change', () => {
    if (_doc) {
      _save('genre', sel.value);
    }
  });
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
  _on('insp-synopsis', 'input', () => _save('synopsis', _val('insp-synopsis')));
  document.getElementById('btn-auto-synopsis')?.addEventListener('click', _autoSynopsis);
  _on('insp-status', 'change', () => _save('status', _val('insp-status')));
  _on('insp-label', 'change', () => {
    const label = _val('insp-label') || null;
    _save('label', label);
    _updateLabelSwatch(label);
  });
  _on('insp-pov',      'change', () => _save('pov',      _val('insp-pov')));
  _on('insp-location', 'change', () => _save('location', _val('insp-location')));
  _on('insp-keywords', 'change', () => _save('keywords', _val('insp-keywords')));
  _on('insp-date',     'change', () => _save('date',     _val('insp-date')));
  _on('insp-duration', 'change', () => _save('duration', _val('insp-duration')));
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
  if (!target) { wrap.hidden = true; label.textContent = ''; return; }
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

  // Restore genre selection
  const genreSel = document.getElementById('insp-genre');
  if (genreSel) genreSel.value = _doc.genre || '';

  // Readability (local)
  _lastPlainText = htmlToPlainText(_doc.content || '');
  const reading = analyzeReadability(_lastPlainText);

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

  const readabilityCatScore = document.querySelector('[data-cat-score="readability"]');
  if (readabilityCatScore) readabilityCatScore.textContent = reading.words ? `${reading.score}` : '\u2014';

  // AI analysis button
  const aiBtn = document.getElementById('btn-analyze-ai');
  if (aiBtn) {
    const fresh = aiBtn.cloneNode(true);
    aiBtn.replaceWith(fresh);
    fresh.addEventListener('click', async () => {
      const lbl = document.getElementById('analyze-ai-label');
      if (lbl) lbl.textContent = 'Analyzing\u2026';
      fresh.disabled = true;
      document.getElementById('ai-analysis-results')?.classList.add('hidden');
      document.getElementById('ai-cat-detail')?.classList.add('hidden');
      document.getElementById('ai-tone-detail')?.classList.add('hidden');

      EDITING_CATS.forEach(cat => {
        const el = document.querySelector(`[data-cat-score="${cat.id}"]`);
        if (el && cat.id !== 'readability') el.textContent = '\u2026';
      });

      try {
        const genre = _doc.genre || document.getElementById('insp-genre')?.value || '';
        const raw = await generateText(
          "You are an expert writing analyst and editor. Respond with ONLY valid JSON, no markdown or extra text.",
          _buildAnalysisPrompt(_lastPlainText, _doc.title || 'Untitled', genre)
        );
        const match = raw.match(/\{[\s\S]*\}/);
        const result = match ? JSON.parse(match[0]) : { tone: 'unknown', suggestions: [raw.slice(0, 200)] };
        _lastAnalysis = result;
        _showAiResults(result, reading);
      } catch (err) {
        import('./ui.js').then(({ showToast }) => showToast(err.message));
        EDITING_CATS.forEach(cat => {
          const el = document.querySelector(`[data-cat-score="${cat.id}"]`);
          if (el && cat.id !== 'readability') el.textContent = '\u2014';
        });
      } finally {
        const lbl2 = document.getElementById('analyze-ai-label');
        if (lbl2) lbl2.textContent = 'Analyze Writing (AI)';
        fresh.disabled = false;
      }
    });
  }
}

// ─── AI Analysis Prompt ──────────────────────────────────────────────────────

function _buildAnalysisPrompt(plainText, title, genre) {
  const genreCtx = genre ? `\nThis document is written in the "${genre}" genre. Evaluate it with that genre's conventions in mind.\n` : '';
  return `Analyze the following creative writing document titled "${title}".${genreCtx}

Evaluate it across these six categories and provide a score from 1-10 for each, plus a one-sentence summary for each category. Also identify the overall tone and give 3 specific improvement suggestions.

Categories:
1. Grammar - spelling, punctuation, sentence structure errors
2. Style - prose quality, word choice, voice clarity, variety
3. Readability - sentence length variation, vocabulary complexity, flow
4. Pacing - scene rhythm, tension, balance of action/description/dialogue
5. Consistency - character names, facts, tense consistency, repetition issues
6. Dialogue - naturalness, distinct voices, proper formatting, tag variety

Also provide a brief "toneExplanation" field (2-3 sentences) explaining why you characterized the tone that way.

Respond with ONLY valid JSON in this exact format:
{
  "tone": "one short phrase describing the dominant tone",
  "toneExplanation": "2-3 sentences explaining the tone characterization and what elements of the writing create this tone.",
  "grammar": { "score": 8, "note": "One sentence about grammar quality" },
  "style": { "score": 7, "note": "One sentence about style quality" },
  "readability": { "score": 7, "note": "One sentence about readability" },
  "pacing": { "score": 6, "note": "One sentence about pacing" },
  "consistency": { "score": 8, "note": "One sentence about consistency" },
  "dialogue": { "score": 7, "note": "One sentence about dialogue" },
  "suggestions": [
    "Specific suggestion 1",
    "Specific suggestion 2",
    "Specific suggestion 3"
  ]
}

Document:
${plainText}`;
}

function _showAiResults(result, reading) {
  const toneEl = document.getElementById('ai-tone-value');
  const listEl = document.getElementById('ai-suggestions-list');
  const wrap   = document.getElementById('ai-analysis-results');

  if (toneEl)  toneEl.textContent = result.tone || '\u2014';
  if (listEl) {
    listEl.innerHTML = (result.suggestions || []).map(s =>
      `<div class="ai-suggestion">${_esc(s)}</div>`
    ).join('');
  }
  wrap?.classList.remove('hidden');

  EDITING_CATS.forEach(cat => {
    const scoreEl = document.querySelector(`[data-cat-score="${cat.id}"]`);
    const hintEl  = document.querySelector(`[data-cat-hint="${cat.id}"]`);
    if (cat.id === 'readability') {
      if (scoreEl && reading) scoreEl.textContent = `${reading.score}`;
      if (hintEl && result.readability?.note) hintEl.textContent = result.readability.note;
      return;
    }
    const catData = result[cat.id];
    if (catData && typeof catData === 'object') {
      if (scoreEl) scoreEl.textContent = `${catData.score}/10`;
      if (hintEl && catData.note) hintEl.textContent = catData.note;
    } else {
      if (scoreEl) scoreEl.textContent = '\u2014';
    }
  });
}

// ─── Category Drill-Down ────────────────────────────────────────────────────

async function _showCategoryDetail(catId) {
  const cat = EDITING_CATS.find(c => c.id === catId);
  if (!cat) return;

  const panel = document.getElementById('ai-cat-detail');
  const title = document.getElementById('ai-cat-detail-title');
  const body  = document.getElementById('ai-cat-detail-body');
  if (!panel || !body) return;

  title.textContent = `${cat.name} \u2014 In-Depth Analysis`;
  panel.classList.remove('hidden');

  // If we have a cached note, show it while we fetch the full analysis
  const cached = _lastAnalysis?.[catId];
  if (cached?.note) {
    body.innerHTML = `<div class="ai-detail-summary">${_esc(cached.note)} (Score: ${cached.score}/10)</div><div class="ai-detail-loading">Loading detailed analysis\u2026</div>`;
  } else {
    body.innerHTML = '<div class="ai-detail-loading">Loading detailed analysis\u2026</div>';
  }

  if (!_lastPlainText) {
    body.innerHTML = '<div class="ai-detail-empty">Open a document and run "Analyze Writing" first.</div>';
    return;
  }

  try {
    const genre = _doc?.genre || document.getElementById('insp-genre')?.value || '';
    const genreCtx = genre ? ` This is a "${genre}" piece.` : '';
    const raw = await generateText(
      "You are an expert writing editor. Give detailed, actionable feedback. Use plain text, no markdown.",
      `Give an in-depth analysis of the ${cat.name.toLowerCase()} in this creative writing document titled "${_doc?.title || 'Untitled'}".${genreCtx}

Specifically address:
- What the writer is doing well
- What specific issues you found (with examples from the text if possible)
- How to improve and fix these issues
- What score you would give (1-10) and why

Be thorough, helpful, and encouraging. Write 3-5 paragraphs.

Document:
${_lastPlainText}`
    );
    body.innerHTML = raw.split('\n').filter(l => l.trim()).map(p =>
      `<p class="ai-detail-para">${_esc(p)}</p>`
    ).join('');
  } catch (err) {
    body.innerHTML = `<div class="ai-detail-error">Error: ${_esc(err.message)}</div>`;
  }
}

// ─── Tone Detail ─────────────────────────────────────────────────────────────

async function _showToneDetail() {
  const panel = document.getElementById('ai-tone-detail');
  const body  = document.getElementById('ai-tone-detail-body');
  if (!panel || !body) return;

  panel.classList.remove('hidden');

  // Show cached explanation if available
  if (_lastAnalysis?.toneExplanation) {
    body.innerHTML = `<p class="ai-detail-para">${_esc(_lastAnalysis.toneExplanation)}</p>`;

    // If we also have the tone, show it as a header
    if (_lastAnalysis.tone) {
      body.innerHTML = `<div class="ai-detail-tone-label">${_esc(_lastAnalysis.tone)}</div>` + body.innerHTML;
    }
    return;
  }

  // No cached explanation \u2014 fetch one
  if (!_lastPlainText) {
    body.innerHTML = '<div class="ai-detail-empty">Run "Analyze Writing" first to see tone details.</div>';
    return;
  }

  body.innerHTML = '<div class="ai-detail-loading">Analyzing tone\u2026</div>';

  try {
    const raw = await generateText(
      "You are an expert writing analyst. Give a detailed explanation. Use plain text, no markdown.",
      `Explain the overall tone and mood of this creative writing document titled "${_doc?.title || 'Untitled'}".

Describe:
- What the dominant tone is and what elements create it
- How the tone shifts throughout the piece (if at all)
- Whether the tone is effective for the type of story being told
- Suggestions for adjusting tone if needed

Write 2-3 paragraphs.

Document:
${_lastPlainText}`
    );
    body.innerHTML = raw.split('\n').filter(l => l.trim()).map(p =>
      `<p class="ai-detail-para">${_esc(p)}</p>`
    ).join('');
  } catch (err) {
    body.innerHTML = `<div class="ai-detail-error">Error: ${_esc(err.message)}</div>`;
  }
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
    const result = await generateText(
      "You are a writing assistant. Write a detailed synopsis of the scene in 3 to 5 paragraphs. Cover the key events, character motivations, emotional beats, and any important plot developments. Return ONLY the synopsis text, no labels or prefixes.",
      `Scene title: "${_doc.title || 'Untitled'}"\n\n${text}`
    );
    const synopsis = result.trim();
    if (synopsis) {
      textarea.value = synopsis;
      _save('synopsis', synopsis);
    }
  } catch (err) {
    textarea.placeholder = err.message;
    setTimeout(() => { textarea.placeholder = "A detailed synopsis of this scene\u2026"; }, 4000);
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
  if (!ts) return '\u2014';
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function _charCount(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.innerText || tmp.textContent || '').replace(/\s/g, '').length;
}
