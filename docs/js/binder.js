// binder.js — Document tree (Binder) rendering and interaction

import {
  getChildren, getDocument, getTrash,
  createDocument, updateDocument, trashDocument,
  reorderDocuments, saveProject,
} from './storage.js';
import { showConfirm, showToast } from './ui.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _project = null;
let _currentDocId = null;
let _onSelectDoc = null;
let _onProjectChange = null;
let _sortableInstances = [];

// ─── SVG Icon Strings ─────────────────────────────────────────────────────────

const ICON = {
  doc: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.5L9.5 0H4zm5.5 1v4h4L9.5 1z"/></svg>`,
  folder: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>`,
  folderOpen: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5zm1.5-.5a.5.5 0 0 0-.5.5v2.5h13V5.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5z"/></svg>`,
  chevronRight: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.22 6.22a.75.75 0 0 1 1.06 0L8 9.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.28a.75.75 0 0 1 0-1.06z"/></svg>`,
  plus: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>`,
  trash: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Wire up binder header buttons */
export function initBinder({ onSelectDoc, onProjectChange }) {
  _onSelectDoc = onSelectDoc;
  _onProjectChange = onProjectChange;

  document.querySelector('[data-action="add-doc"]')?.addEventListener('click', () => _addDocument('doc', null));
  document.querySelector('[data-action="add-folder"]')?.addEventListener('click', () => _addDocument('folder', null));
}

/** Rebuild the entire binder tree from the current project state */
export function renderBinder(project, currentDocId) {
  _project = project;
  _currentDocId = currentDocId;

  // Destroy stale Sortable instances
  _sortableInstances.forEach(s => s.destroy?.());
  _sortableInstances = [];

  const container = document.getElementById('binder-tree');
  if (!container) return;
  container.innerHTML = '';

  const titleEl = document.getElementById('binder-project-title');
  if (titleEl) titleEl.textContent = project.title;

  // Root-level documents
  const rootDocs = getChildren(project, null);
  container.appendChild(_buildList(rootDocs, null));

  // Trash indicator
  const trash = getTrash(project);
  if (trash.length) {
    const trashEl = document.createElement('div');
    trashEl.className = 'binder-trash-row';
    trashEl.innerHTML = `${ICON.trash}<span>Trash</span><span class="binder-trash-count">${trash.length}</span>`;
    container.appendChild(trashEl);
  }
}

/** Update the selected highlight without re-rendering the whole tree */
export function setBinderSelection(docId) {
  _currentDocId = docId;
  document.querySelectorAll('.binder-item-row.selected')
    .forEach(el => el.classList.remove('selected'));
  if (docId) {
    document.querySelector(`.binder-item-row[data-doc-id="${docId}"]`)
      ?.classList.add('selected');
  }
}

// ─── Tree Building ────────────────────────────────────────────────────────────

function _buildList(docs, parentId) {
  const ul = document.createElement('ul');
  ul.className = 'binder-list';
  ul.dataset.parentId = parentId ?? 'root';
  ul.setAttribute('role', 'group');

  docs.forEach(doc => ul.appendChild(_buildItem(doc)));

  // Drag-and-drop via Sortable.js (optional — degrades gracefully without it)
  if (typeof Sortable !== 'undefined') {
    const s = Sortable.create(ul, {
      group: { name: 'binder', pull: true, put: true },
      animation: 120,
      ghostClass: 'binder-ghost',
      chosenClass: 'binder-chosen',
      handle: '.binder-item-row',
      onEnd(evt) {
        const newParentId = evt.to.dataset.parentId === 'root' ? null : evt.to.dataset.parentId;
        const orderedIds = Array.from(evt.to.querySelectorAll(':scope > .binder-item'))
          .map(li => li.dataset.docId);
        reorderDocuments(_project, newParentId, orderedIds);
        saveProject(_project);
        _onProjectChange?.(_project);
      },
    });
    _sortableInstances.push(s);
  }

  return ul;
}

function _buildItem(doc) {
  const isFolder = doc.type === 'folder';
  const isSelected = doc.id === _currentDocId;
  const children = isFolder ? getChildren(_project, doc.id) : [];

  const li = document.createElement('li');
  li.className = 'binder-item';
  li.dataset.docId = doc.id;
  li.setAttribute('role', 'treeitem');
  li.setAttribute('aria-selected', isSelected ? 'true' : 'false');

  // ── Row ──────────────────────────────────────────────────────────────────
  const row = document.createElement('div');
  row.className = `binder-item-row${isSelected ? ' selected' : ''}`;
  row.dataset.docId = doc.id;
  row.setAttribute('tabindex', '0');

  // Arrow (folders only)
  const arrow = document.createElement('span');
  arrow.className = 'binder-arrow';
  if (isFolder) {
    arrow.innerHTML = doc.collapsed ? ICON.chevronRight : ICON.chevronDown;
    arrow.addEventListener('click', e => { e.stopPropagation(); _toggleFolder(doc.id); });
  }

  // Icon
  const icon = document.createElement('span');
  icon.className = 'binder-icon';
  icon.innerHTML = isFolder ? (doc.collapsed ? ICON.folder : ICON.folderOpen) : ICON.doc;

  // Title
  const titleSpan = document.createElement('span');
  titleSpan.className = 'binder-title';
  titleSpan.textContent = doc.title;

  // Action buttons (visible on hover/focus)
  const actions = document.createElement('span');
  actions.className = 'binder-actions';

  if (isFolder) {
    const addBtn = _actionBtn(ICON.plus, 'Add document inside', () => _addDocument('doc', doc.id));
    actions.appendChild(addBtn);
  }
  const delBtn = _actionBtn(ICON.trash, 'Move to Trash', () => _deleteItem(doc.id));
  delBtn.classList.add('danger');
  actions.appendChild(delBtn);

  row.appendChild(arrow);
  row.appendChild(icon);
  row.appendChild(titleSpan);
  row.appendChild(actions);

  // Events
  row.addEventListener('click', () => _selectDocument(doc.id));
  row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _selectDocument(doc.id); } });
  titleSpan.addEventListener('dblclick', e => { e.stopPropagation(); _startRename(doc.id, titleSpan); });

  li.appendChild(row);

  // Children (folders)
  if (isFolder) {
    const childList = _buildList(children, doc.id);
    if (doc.collapsed) childList.style.display = 'none';
    li.appendChild(childList);
  }

  return li;
}

function _actionBtn(iconHtml, label, handler) {
  const btn = document.createElement('button');
  btn.className = 'binder-action-btn';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = iconHtml;
  btn.addEventListener('click', e => { e.stopPropagation(); handler(); });
  return btn;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

function _selectDocument(id) {
  _currentDocId = id;
  setBinderSelection(id);
  _onSelectDoc?.(id);
}

function _toggleFolder(id) {
  const doc = getDocument(_project, id);
  if (!doc || doc.type !== 'folder') return;
  doc.collapsed = !doc.collapsed;
  saveProject(_project);

  const li = document.querySelector(`.binder-item[data-doc-id="${id}"]`);
  const childList = li?.querySelector(':scope > .binder-list');
  const arrow = li?.querySelector('.binder-arrow');
  const icon = li?.querySelector('.binder-icon');

  if (doc.collapsed) {
    if (childList) childList.style.display = 'none';
    if (arrow) arrow.innerHTML = ICON.chevronRight;
    if (icon) icon.innerHTML = ICON.folder;
  } else {
    if (childList) childList.style.display = '';
    if (arrow) arrow.innerHTML = ICON.chevronDown;
    if (icon) icon.innerHTML = ICON.folderOpen;
  }
}

function _startRename(id, titleEl) {
  const doc = getDocument(_project, id);
  if (!doc) return;

  const input = document.createElement('input');
  input.className = 'binder-rename-input';
  input.type = 'text';
  input.value = doc.title;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = () => {
    const newTitle = input.value.trim() || doc.title;
    updateDocument(_project, id, { title: newTitle });
    saveProject(_project);
    titleEl.textContent = newTitle;
    input.replaceWith(titleEl);
    _onProjectChange?.(_project);
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = doc.title; input.blur(); }
  });
}

function _addDocument(type, parentId) {
  const doc = createDocument(_project, { type, parentId });
  saveProject(_project);
  renderBinder(_project, _currentDocId);

  // Expand the parent folder if needed
  if (parentId) {
    const parent = getDocument(_project, parentId);
    if (parent?.collapsed) _toggleFolder(parentId);
  }

  // Select and immediately rename the new item
  _selectDocument(doc.id);
  const titleEl = document.querySelector(`.binder-item-row[data-doc-id="${doc.id}"] .binder-title`);
  if (titleEl) _startRename(doc.id, titleEl);

  _onProjectChange?.(_project);
}

function _deleteItem(id) {
  const doc = getDocument(_project, id);
  if (!doc) return;

  showConfirm(`Move "${doc.title}" to Trash?`, () => {
    trashDocument(_project, id);
    if (_currentDocId === id) {
      _currentDocId = null;
      _onSelectDoc?.(null);
    }
    saveProject(_project);
    renderBinder(_project, _currentDocId);
    _onProjectChange?.(_project);
    showToast('Moved to Trash');
  });
}
