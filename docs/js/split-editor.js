// split-editor.js — Side-by-side split editor (Phase 13)
// Renders a read-only reference pane alongside the main editor.
// The reference pane shows any document chosen from a dropdown.

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject  = null;
let _editorPane  = null;   // #editor-pane element
let _refPane     = null;   // .split-reference element (built lazily)
let _active      = false;
let _refDocId    = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the split editor module.
 * @param {{ getProject: Function }} opts
 */
export function initSplitEditor({ getProject }) {
  _getProject = getProject;
  _editorPane = document.getElementById('editor-pane');
}

/** Toggle the split editor on/off. */
export function toggleSplitEditor() {
  _active = !_active;
  if (_active) {
    _open();
  } else {
    _close();
  }
  return _active;
}

/** True when the split pane is currently visible. */
export function isSplitActive() {
  return _active;
}

/**
 * Refresh the reference pane content (call after a document is renamed/edited).
 * No-op if split is not active.
 */
export function refreshSplitPane() {
  if (_active && _refDocId) _loadRef(_refDocId);
}

// ─── Open / Close ─────────────────────────────────────────────────────────────

function _open() {
  if (!_editorPane) return;

  if (!_refPane) {
    _refPane = _buildRefPane();
    _editorPane.appendChild(_refPane);
  }

  _editorPane.classList.add('split-active');
  _refPane.classList.remove('hidden');

  // Default: first doc in project that isn't the current doc
  const project = _getProject?.();
  if (project) {
    const docs = (project.documents || []).filter(d => d.type === 'doc' && !d.inTrash);
    if (docs.length) {
      _refDocId = docs[0].id;
      _populateSelect(docs);
      _loadRef(_refDocId);
    }
  }
}

function _close() {
  _editorPane?.classList.remove('split-active');
  _refPane?.classList.add('hidden');
}

// ─── Building the Reference Pane ──────────────────────────────────────────────

function _buildRefPane() {
  const pane = document.createElement('div');
  pane.className = 'split-reference';

  pane.innerHTML = `
    <div class="split-ref-header">
      <span class="split-ref-label">Reference</span>
      <select class="split-ref-select" id="split-ref-select" aria-label="Reference document"></select>
      <button class="split-ref-close" id="split-ref-close" aria-label="Close reference pane">&times;</button>
    </div>
    <div class="split-ref-body" id="split-ref-body" aria-label="Reference document content"></div>`;

  pane.querySelector('#split-ref-close').addEventListener('click', () => {
    _active = false;
    _close();
    // Sync the toolbar button state
    const btn = document.getElementById('btn-split');
    btn?.classList.remove('active');
  });

  pane.querySelector('#split-ref-select').addEventListener('change', e => {
    _refDocId = e.target.value;
    _loadRef(_refDocId);
  });

  return pane;
}

function _populateSelect(docs) {
  const sel = document.getElementById('split-ref-select');
  if (!sel) return;
  sel.innerHTML = docs.map(d =>
    `<option value="${_esc(d.id)}"${d.id === _refDocId ? ' selected' : ''}>${_esc(d.title || 'Untitled')}</option>`
  ).join('');
}

function _loadRef(docId) {
  const project = _getProject?.();
  if (!project) return;
  const doc = (project.documents || []).find(d => d.id === docId);
  const body = document.getElementById('split-ref-body');
  if (!body) return;

  if (!doc) {
    body.innerHTML = '<p style="color:var(--fg-muted);font-size:0.9rem">Document not found.</p>';
    return;
  }

  body.innerHTML = doc.content || '<p style="color:var(--fg-muted);font-size:0.9rem">No content.</p>';

  // Make links inert in read-only view
  body.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => e.preventDefault());
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
