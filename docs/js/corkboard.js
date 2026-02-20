// corkboard.js — Visual index-card grid for planning scenes
// Phase 2: The Corkboard & Structure

import { getChildren, updateDocument, saveProject } from './storage.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LABEL_COLORS = {
  red:    '#d95f5f',
  orange: '#d4874a',
  yellow: '#c9a26a',
  green:  '#5f9e6e',
  blue:   '#4a7ec9',
  purple: '#8a6acf',
};

// ─── State ────────────────────────────────────────────────────────────────────

let _project  = null;
let _parentId = null;
let _onSelectDoc      = null;
let _onProjectChange  = null;
let _sortable         = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wire up the corkboard. Must be called once at app init.
 * @param {{ onSelectDoc: Function, onProjectChange: Function }} opts
 */
export function initCorkboard({ onSelectDoc, onProjectChange }) {
  _onSelectDoc     = onSelectDoc;
  _onProjectChange = onProjectChange;

  // Zoom slider
  const slider = document.getElementById('cork-zoom');
  if (slider) {
    slider.addEventListener('input', () => {
      const grid = document.getElementById('corkboard-grid');
      if (grid) grid.style.setProperty('--card-w', `${slider.value}px`);
    });
  }
}

/**
 * Render the corkboard for the given parent folder (null = top level).
 * @param {Object} project
 * @param {string|null} parentId
 */
export function renderCorkboard(project, parentId) {
  _project  = project;
  _parentId = parentId;

  const grid = document.getElementById('corkboard-grid');
  if (!grid) return;

  // Folder breadcrumb label
  _updateCorkboardTitle(parentId);

  const docs = getChildren(project, parentId).filter(d => d.type === 'doc');

  if (docs.length === 0) {
    grid.innerHTML = '<p class="corkboard-empty">No scenes here. Add documents to this folder via the Binder.</p>';
    if (_sortable) { _sortable.destroy(); _sortable = null; }
    return;
  }

  grid.innerHTML = '';
  docs.forEach(doc => grid.appendChild(_buildCard(doc)));

  // Drag-and-drop reorder
  if (_sortable) _sortable.destroy();
  if (window.Sortable) {
    _sortable = Sortable.create(grid, {
      animation: 150,
      ghostClass: 'card-ghost',
      chosenClass: 'card-chosen',
      onEnd: _handleReorder,
    });
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _updateCorkboardTitle(parentId) {
  const label = document.getElementById('corkboard-folder-label');
  if (!label || !_project) return;
  if (!parentId) {
    label.textContent = 'All Scenes';
    return;
  }
  const folder = _project.documents.find(d => d.id === parentId);
  label.textContent = folder ? folder.title : 'Scenes';
}

function _buildCard(doc) {
  const card = document.createElement('div');
  card.className = 'cork-card';
  card.dataset.id = doc.id;

  // Label strip at top
  const strip = document.createElement('div');
  strip.className = 'card-label-strip';
  if (doc.label && LABEL_COLORS[doc.label]) {
    strip.style.background = LABEL_COLORS[doc.label];
  }
  card.appendChild(strip);

  // Card body
  const body = document.createElement('div');
  body.className = 'card-body';

  // Title
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = doc.title;
  title.setAttribute('role', 'button');
  title.setAttribute('tabindex', '0');
  title.title = 'Open in editor';
  title.addEventListener('click', () => _onSelectDoc?.(doc.id));
  title.addEventListener('keydown', e => { if (e.key === 'Enter') _onSelectDoc?.(doc.id); });
  body.appendChild(title);

  // Synopsis (contenteditable)
  const synopsis = document.createElement('div');
  synopsis.className = 'card-synopsis';
  synopsis.contentEditable = 'true';
  synopsis.setAttribute('aria-label', 'Synopsis');
  synopsis.dataset.placeholder = 'Add synopsis…';
  synopsis.textContent = doc.synopsis || '';
  synopsis.addEventListener('blur', () => {
    const text = synopsis.textContent.trim();
    if (text !== (doc.synopsis || '')) {
      updateDocument(_project, doc.id, { synopsis: text });
      doc.synopsis = text;
      saveProject(_project);
      _onProjectChange?.(_project);
    }
  });
  // Prevent card drag while typing
  synopsis.addEventListener('mousedown', e => e.stopPropagation());
  body.appendChild(synopsis);

  // Footer: word count + status dot + label picker
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const wc = document.createElement('span');
  wc.className = 'card-wc';
  const n = doc.wordCount || 0;
  wc.textContent = `${n.toLocaleString()} ${n === 1 ? 'word' : 'words'}`;
  footer.appendChild(wc);

  // Status indicator + label picker grouped on the right
  const footerRight = document.createElement('div');
  footerRight.className = 'card-footer-right';

  const STATUS_LABELS = { 'not-started': 'Not Started', draft: 'Draft', revised: 'Revised', final: 'Final' };
  const statusDot = document.createElement('span');
  statusDot.className = `card-status-dot status-${doc.status || 'draft'}`;
  statusDot.title     = STATUS_LABELS[doc.status] || 'Draft';
  footerRight.appendChild(statusDot);

  footerRight.appendChild(_buildLabelPicker(doc));
  footer.appendChild(footerRight);
  body.appendChild(footer);
  card.appendChild(body);

  return card;
}

function _buildLabelPicker(doc) {
  const wrap = document.createElement('div');
  wrap.className = 'card-label-picker';

  const dot = document.createElement('button');
  dot.className = 'card-label-dot';
  dot.title = 'Set label colour';
  dot.setAttribute('aria-label', 'Set label colour');
  dot.style.background = (doc.label && LABEL_COLORS[doc.label])
    ? LABEL_COLORS[doc.label]
    : 'var(--border)';

  const dropdown = document.createElement('div');
  dropdown.className = 'card-label-dropdown hidden';

  // "No label" swatch
  const noneBtn = document.createElement('button');
  noneBtn.className = 'label-swatch label-none';
  noneBtn.title = 'Remove label';
  noneBtn.addEventListener('click', e => {
    e.stopPropagation();
    _setLabel(doc, null);
  });
  dropdown.appendChild(noneBtn);

  // Colour swatches
  Object.entries(LABEL_COLORS).forEach(([name, color]) => {
    const swatch = document.createElement('button');
    swatch.className = 'label-swatch';
    swatch.style.background = color;
    swatch.title = name;
    swatch.addEventListener('click', e => {
      e.stopPropagation();
      _setLabel(doc, name);
    });
    dropdown.appendChild(swatch);
  });

  dot.addEventListener('click', e => {
    e.stopPropagation();
    // Close any other open dropdowns first
    document.querySelectorAll('.card-label-dropdown:not(.hidden)').forEach(d => {
      if (d !== dropdown) d.classList.add('hidden');
    });
    dropdown.classList.toggle('hidden');
  });

  // Close on outside click
  document.addEventListener('click', () => dropdown.classList.add('hidden'));

  wrap.appendChild(dot);
  wrap.appendChild(dropdown);
  return wrap;
}

function _setLabel(doc, labelName) {
  updateDocument(_project, doc.id, { label: labelName });
  doc.label = labelName;
  saveProject(_project);
  _onProjectChange?.(_project);
  renderCorkboard(_project, _parentId);
}

function _handleReorder() {
  const grid = document.getElementById('corkboard-grid');
  if (!grid || !_project) return;

  const orderedIds = [...grid.querySelectorAll('.cork-card')].map(el => el.dataset.id);
  orderedIds.forEach((id, index) => {
    const doc = _project.documents.find(d => d.id === id);
    if (doc) doc.order = index;
  });

  saveProject(_project);
  _onProjectChange?.(_project);
}

// ─── Split Corkboard ──────────────────────────────────────────────────────────

let _splitMode    = false;
let _splitSortable = null;

/** Toggle split corkboard mode (two folders side by side) */
export function toggleSplitCorkboard() {
  _splitMode = !_splitMode;
  const pane = document.getElementById('corkboard-pane');
  if (pane) pane.classList.toggle('split-mode', _splitMode);

  const splitBtn = document.getElementById('btn-cork-split');
  if (splitBtn) {
    splitBtn.classList.toggle('active', _splitMode);
    splitBtn.setAttribute('aria-pressed', _splitMode ? 'true' : 'false');
  }

  if (_splitMode) {
    _renderSplitView();
  } else {
    // Remove split grid
    const splitGrid = document.getElementById('corkboard-grid-split');
    splitGrid?.remove();
    const splitLabel = document.getElementById('corkboard-split-label');
    splitLabel?.remove();
    if (_splitSortable) { _splitSortable.destroy(); _splitSortable = null; }
  }
}

function _renderSplitView() {
  if (!_project) return;

  // Find folders to offer as split target
  const folders = _project.documents.filter(d => d.type === 'folder' && !d.inTrash && d.id !== _parentId);
  if (!folders.length) {
    const pane = document.getElementById('corkboard-pane');
    const msg = document.createElement('p');
    msg.id = 'corkboard-split-label';
    msg.className = 'corkboard-empty';
    msg.textContent = 'No other folders to split with.';
    pane?.appendChild(msg);
    return;
  }

  // Use the first other folder as the default split target
  const splitFolder = folders[0];
  _buildSplitGrid(splitFolder);
}

function _buildSplitGrid(folder) {
  // Remove existing
  document.getElementById('corkboard-grid-split')?.remove();
  document.getElementById('corkboard-split-label')?.remove();
  if (_splitSortable) { _splitSortable.destroy(); _splitSortable = null; }

  const pane = document.getElementById('corkboard-pane');
  if (!pane) return;

  // Label with folder picker
  const label = document.createElement('div');
  label.id = 'corkboard-split-label';
  label.className = 'cork-split-header';

  const folders = _project.documents.filter(d => d.type === 'folder' && !d.inTrash && d.id !== _parentId);
  let selectHtml = `<select class="cork-split-select">`;
  folders.forEach(f => {
    selectHtml += `<option value="${f.id}"${f.id === folder.id ? ' selected' : ''}>${f.title}</option>`;
  });
  selectHtml += '</select>';
  label.innerHTML = selectHtml;

  const select = label.querySelector('select');
  select?.addEventListener('change', () => {
    const newFolder = _project.documents.find(d => d.id === select.value);
    if (newFolder) _buildSplitGrid(newFolder);
  });

  pane.appendChild(label);

  // Grid
  const grid = document.createElement('div');
  grid.id = 'corkboard-grid-split';
  grid.className = 'corkboard-grid';
  grid.setAttribute('aria-label', `${folder.title} scenes`);

  const docs = getChildren(_project, folder.id).filter(d => d.type === 'doc');
  if (!docs.length) {
    grid.innerHTML = '<p class="corkboard-empty">No scenes in this folder.</p>';
  } else {
    docs.forEach(doc => grid.appendChild(_buildCard(doc)));
    if (window.Sortable) {
      _splitSortable = Sortable.create(grid, {
        animation: 150,
        ghostClass: 'card-ghost',
        chosenClass: 'card-chosen',
        group: { name: 'corkboard-split', pull: true, put: true },
        onEnd: () => {
          const ids = [...grid.querySelectorAll('.cork-card')].map(el => el.dataset.id);
          ids.forEach((id, i) => {
            const doc = _project.documents.find(d => d.id === id);
            if (doc) { doc.order = i; doc.parentId = folder.id; }
          });
          saveProject(_project);
          _onProjectChange?.(_project);
        },
      });
    }
  }

  pane.appendChild(grid);
}
