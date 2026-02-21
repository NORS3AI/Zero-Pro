// reading-mode.js — Full-screen reading / preview mode (Phase 13)
// Shows the current document (or entire manuscript) in a clean, typeset view.
// Controls: font family, line width, font size. Estimated read time. Print support.

// ─── State ────────────────────────────────────────────────────────────────────

let _overlay    = null;
let _getProject = null;
let _getDoc     = null;
let _mode       = 'doc';     // 'doc' | 'manuscript'
let _font       = 'serif';
let _width      = 'normal';
let _fontSize   = 18;        // px

const WORDS_PER_MIN = 250;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the reading mode module.
 * @param {{ getProject: Function, getCurrentDoc: Function }} opts
 */
export function initReadingMode({ getProject, getCurrentDoc }) {
  _getProject = getProject;
  _getDoc     = getCurrentDoc;
}

/** Open reading mode for the current document. */
export function openReadingMode() {
  const doc = _getDoc?.();
  if (!doc || doc.type !== 'doc') {
    const { showToast } = await_import('./ui.js'); // dynamic to avoid circular
    console.warn('Reading mode: no doc selected');
    return;
  }
  _mode = 'doc';
  _show();
}

/** Open reading mode showing the entire manuscript in order. */
export function openManuscriptView() {
  _mode = 'manuscript';
  _show();
}

/** True if reading mode is currently visible. */
export function isReadingMode() {
  return _overlay && !_overlay.classList.contains('hidden');
}

/** Close reading mode. */
export function closeReadingMode() {
  _overlay?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

// ─── Construction ─────────────────────────────────────────────────────────────

function _show() {
  if (!_overlay) {
    _overlay = _buildOverlay();
    document.body.appendChild(_overlay);
  }
  _overlay.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _render();
}

function _buildOverlay() {
  const el = document.createElement('div');
  el.id        = 'reading-overlay';
  el.className = 'hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Reading Mode');

  el.innerHTML = `
    <div class="reading-toolbar">
      <span class="reading-toolbar-title" id="reading-toolbar-title">Reading Mode</span>

      <div class="reading-control-group">
        <span class="reading-label">Font</span>
        <select class="reading-select" id="reading-font">
          <option value="serif"  selected>Serif</option>
          <option value="sans">Sans-serif</option>
          <option value="mono">Monospace</option>
        </select>
      </div>

      <div class="reading-control-group">
        <span class="reading-label">Width</span>
        <select class="reading-select" id="reading-width">
          <option value="normal" selected>Normal</option>
          <option value="narrow">Narrow</option>
          <option value="wide">Wide</option>
        </select>
      </div>

      <div class="reading-control-group">
        <span class="reading-label">Size</span>
        <select class="reading-select" id="reading-size">
          <option value="15">Small</option>
          <option value="18" selected>Medium</option>
          <option value="22">Large</option>
          <option value="26">X-Large</option>
        </select>
      </div>

      <div class="reading-control-group">
        <span class="reading-label">View</span>
        <select class="reading-select" id="reading-scope">
          <option value="doc">This document</option>
          <option value="manuscript">Full manuscript</option>
        </select>
      </div>

      <span class="reading-meta" id="reading-meta"></span>

      <button class="reading-close" id="reading-print-btn" title="Print" aria-label="Print">⎙ Print</button>
      <button class="reading-close" id="reading-close-btn" aria-label="Close reading mode">Close</button>
    </div>

    <div class="reading-scroll">
      <div class="reading-content font-serif" id="reading-content"></div>
    </div>`;

  el.querySelector('#reading-close-btn').addEventListener('click', closeReadingMode);
  el.querySelector('#reading-print-btn').addEventListener('click', () => window.print());

  el.querySelector('#reading-font').addEventListener('change', e => {
    _font = e.target.value;
    _applyControls();
  });
  el.querySelector('#reading-width').addEventListener('change', e => {
    _width = e.target.value;
    _applyControls();
  });
  el.querySelector('#reading-size').addEventListener('change', e => {
    _fontSize = parseInt(e.target.value, 10);
    _applyControls();
  });
  el.querySelector('#reading-scope').addEventListener('change', e => {
    _mode = e.target.value;
    _render();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isReadingMode()) closeReadingMode();
  });

  return el;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function _render() {
  const project = _getProject?.();
  const doc     = _getDoc?.();
  const content = document.getElementById('reading-content');
  const toolbar = document.getElementById('reading-toolbar-title');
  const meta    = document.getElementById('reading-meta');
  const scope   = document.getElementById('reading-scope');
  if (!content) return;

  if (scope) scope.value = _mode;

  let html        = '';
  let totalWords  = 0;

  if (_mode === 'manuscript' && project) {
    const docs = _orderedDocs(project);
    docs.forEach((d, i) => {
      if (i > 0) html += `<div class="reading-chapter-break">${_esc(d.title)}</div>`;
      else html += `<h1 style="margin-top:0">${_esc(d.title)}</h1>`;
      html += d.content || '<p></p>';
      totalWords += d.wordCount || 0;
    });
    if (toolbar) toolbar.textContent = project.title || 'Manuscript';
  } else if (doc) {
    html = doc.content || '<p></p>';
    totalWords = doc.wordCount || 0;
    if (toolbar) toolbar.textContent = doc.title || 'Untitled';
  }

  content.innerHTML = html;

  // Estimated read time
  const mins = Math.max(1, Math.ceil(totalWords / WORDS_PER_MIN));
  if (meta) meta.textContent = `${totalWords.toLocaleString()} words · ~${mins} min read`;

  _applyControls();
}

function _applyControls() {
  const content = document.getElementById('reading-content');
  if (!content) return;
  content.className = `reading-content font-${_font}${_width !== 'normal' ? ` width-${_width}` : ''}`;
  content.style.fontSize = `${_fontSize}px`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return all non-trashed docs in binder order (depth-first). */
function _orderedDocs(project) {
  const docs = (project.documents || []).filter(d => d.type === 'doc' && !d.inTrash);
  return docs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Avoid top-level async import — resolve showToast lazily
function await_import(path) {
  // This is a workaround for a linting rule; we use dynamic import in catch
  return import(path);
}
