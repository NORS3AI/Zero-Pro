// outline.js — Tabular outline view for the full manuscript
// Phase 2: The Corkboard & Structure

import { getChildren, updateDocument, saveProject } from './storage.js';
import { LABEL_COLORS } from './corkboard.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'draft',       label: 'Draft'       },
  { value: 'revised',     label: 'Revised'     },
  { value: 'final',       label: 'Final'       },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _project         = null;
let _onSelectDoc     = null;
let _onProjectChange = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wire up the outline view. Must be called once at app init.
 * @param {{ onSelectDoc: Function, onProjectChange: Function }} opts
 */
export function initOutline({ onSelectDoc, onProjectChange }) {
  _onSelectDoc     = onSelectDoc;
  _onProjectChange = onProjectChange;
}

/**
 * Render the full outline table.
 * @param {Object} project
 */
export function renderOutline(project) {
  _project = project;

  const tbody = document.getElementById('outline-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  _renderChildren(tbody, null, 0);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function _renderChildren(tbody, parentId, depth) {
  const children = getChildren(_project, parentId);
  children.forEach(doc => {
    tbody.appendChild(_buildRow(doc, depth));
    if (doc.type === 'folder' && !doc.collapsed) {
      _renderChildren(tbody, doc.id, depth + 1);
    }
  });
}

function _buildRow(doc, depth) {
  const row = document.createElement('tr');
  row.className = `outline-row outline-row--${doc.type}`;
  row.dataset.id = doc.id;

  // ── Title cell ──────────────────────────────────────────────────────────────
  const titleCell = document.createElement('td');
  titleCell.className = 'outline-cell outline-title-cell';
  titleCell.style.paddingLeft = `${12 + depth * 20}px`;

  if (doc.type === 'folder') {
    const arrow = document.createElement('button');
    arrow.className = 'outline-folder-arrow';
    arrow.setAttribute('aria-label', doc.collapsed ? 'Expand folder' : 'Collapse folder');
    arrow.innerHTML = doc.collapsed
      ? '<svg viewBox="0 0 10 10" fill="currentColor"><path d="M3 2l4 3-4 3V2z"/></svg>'
      : '<svg viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 4 3-4H2z"/></svg>';
    arrow.addEventListener('click', e => {
      e.stopPropagation();
      doc.collapsed = !doc.collapsed;
      saveProject(_project);
      renderOutline(_project);
    });
    titleCell.appendChild(arrow);
  }

  const icon = document.createElement('span');
  icon.className = 'outline-type-icon';
  icon.innerHTML = doc.type === 'folder'
    ? '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.828 3h3.172a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2h2.172a2 2 0 0 1 1.414.586L7.707 4H2v10h12V5a1 1 0 0 0-1-1H9.828a1 1 0 0 1-.707-.293L8.414 3H6.586a1 1 0 0 0-.707.293L5.586 3.586z"/></svg>'
    : '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>';
  titleCell.appendChild(icon);

  const titleText = document.createElement('span');
  titleText.className = 'outline-title-text';
  titleText.textContent = doc.title;
  if (doc.type === 'doc') {
    titleText.setAttribute('role', 'button');
    titleText.setAttribute('tabindex', '0');
    titleText.title = 'Open in editor';
    titleText.addEventListener('click', () => _onSelectDoc?.(doc.id));
    titleText.addEventListener('keydown', e => { if (e.key === 'Enter') _onSelectDoc?.(doc.id); });
  }
  titleCell.appendChild(titleText);
  row.appendChild(titleCell);

  // ── Synopsis cell ────────────────────────────────────────────────────────────
  const synCell = document.createElement('td');
  synCell.className = 'outline-cell outline-synopsis-cell';
  if (doc.type === 'doc') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'outline-synopsis-input';
    input.value = doc.synopsis || '';
    input.placeholder = 'Add synopsis…';
    input.setAttribute('aria-label', 'Synopsis');
    input.addEventListener('change', () => {
      updateDocument(_project, doc.id, { synopsis: input.value });
      doc.synopsis = input.value;
      saveProject(_project);
      _onProjectChange?.(_project);
    });
    synCell.appendChild(input);
  }
  row.appendChild(synCell);

  // ── Status cell ─────────────────────────────────────────────────────────────
  const statusCell = document.createElement('td');
  statusCell.className = 'outline-cell outline-status-cell';
  if (doc.type === 'doc') {
    const sel = document.createElement('select');
    sel.className = 'outline-status-select';
    sel.setAttribute('aria-label', 'Status');
    STATUS_OPTIONS.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (doc.status === value) opt.selected = true;
      sel.appendChild(opt);
    });
    // If existing doc has old 'draft' value, default to 'draft'
    if (!doc.status) sel.value = 'draft';
    sel.addEventListener('change', () => {
      updateDocument(_project, doc.id, { status: sel.value });
      doc.status = sel.value;
      saveProject(_project);
      _onProjectChange?.(_project);
    });
    statusCell.appendChild(sel);
  }
  row.appendChild(statusCell);

  // ── Word count cell ──────────────────────────────────────────────────────────
  const wcCell = document.createElement('td');
  wcCell.className = 'outline-cell outline-wc-cell';
  if (doc.type === 'doc') {
    const n = doc.wordCount || 0;
    wcCell.textContent = n.toLocaleString();
  } else if (doc.type === 'folder') {
    // Sum word counts of direct doc children for the folder row
    const total = _project.documents
      .filter(d => !d.inTrash && d.type === 'doc' && _isDescendant(d, doc.id))
      .reduce((s, d) => s + (d.wordCount || 0), 0);
    if (total > 0) {
      wcCell.textContent = total.toLocaleString();
      wcCell.style.fontStyle = 'italic';
    }
  }
  row.appendChild(wcCell);

  // ── Label cell ───────────────────────────────────────────────────────────────
  const labelCell = document.createElement('td');
  labelCell.className = 'outline-cell outline-label-cell';
  if (doc.label && LABEL_COLORS[doc.label]) {
    const dot = document.createElement('span');
    dot.className = 'outline-label-dot';
    dot.style.background = LABEL_COLORS[doc.label];
    dot.title = doc.label;
    labelCell.appendChild(dot);
  }
  row.appendChild(labelCell);

  return row;
}

/** Check whether doc is a descendant of folderId */
function _isDescendant(doc, folderId) {
  let current = doc;
  while (current.parentId) {
    if (current.parentId === folderId) return true;
    current = _project.documents.find(d => d.id === current.parentId);
    if (!current) break;
  }
  return false;
}
