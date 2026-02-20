// binder.js — Document tree (Binder) rendering and interaction

import {
  getChildren, getDocument, getTrash,
  createDocument, updateDocument, trashDocument, restoreDocument, purgeDocument,
  reorderDocuments, saveProject, generateId,
} from './storage.js';
import { showConfirm, showToast } from './ui.js';
import { LABEL_COLORS } from './corkboard.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _project = null;
let _currentDocId = null;
let _onSelectDoc = null;
let _onProjectChange = null;
let _onInsertImageInEditor = null;
let _sortableInstances = [];
let _ctxMenu  = null;   // context menu element (singleton)
let _ctxDocId = null;   // doc ID targeted by current context menu
let _trashExpanded = false;
let _multiSelect = new Set();  // IDs of multi-selected documents
let _binderPinned = localStorage.getItem('zp_binder_pinned') === '1';

// ─── SVG Icon Strings ─────────────────────────────────────────────────────────

const ICON = {
  doc: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.5L9.5 0H4zm5.5 1v4h4L9.5 1z"/></svg>`,
  folder: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>`,
  folderOpen: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5zm1.5-.5a.5.5 0 0 0-.5.5v2.5h13V5.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5z"/></svg>`,
  image: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>`,
  clip: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.715 6.542L3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg>`,
  chevronRight: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.22 6.22a.75.75 0 0 1 1.06 0L8 9.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.28a.75.75 0 0 1 0-1.06z"/></svg>`,
  audio: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9 13c0 1.105-1.12 2-2.5 2S4 14.105 4 13s1.12-2 2.5-2 2.5.895 2.5 2zm0-10.586V9.28a2.5 2.5 0 0 1 1 0V3h3V1H9v1.414zM10 4v5.279a2.5 2.5 0 0 1 1 0V4h-1z"/><path d="M9 13c0 1.105-1.12 2-2.5 2S4 14.105 4 13s1.12-2 2.5-2 2.5.895 2.5 2z"/></svg>`,
  pin: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.854V2.377a2.142 2.142 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/></svg>`,
  pinSlash: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.086.9 8 2l.5 4.5-3.5 2.5L4 10l2 1.5v.5l-2 2 .5.5 2-2h.5L8.5 14v-2l1-.5L9 6.5l1-1 2 1.5.5-.5L9.086.9zM13.5 2.5l-1 1-1.5-1.5 1-1 1.5 1.5z"/><path d="M1 1 0 2l5.5 5.5L4 10l2 1.5v.5l-2 2 .5.5 2-2h.5L8.5 14v-2l1-.5L8 9.5 1 1z" opacity=".4"/></svg>`,
  plus: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>`,
  trash: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>`,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Wire up binder header buttons */
export function initBinder({ onSelectDoc, onProjectChange, onInsertImageInEditor }) {
  _onSelectDoc = onSelectDoc;
  _onProjectChange = onProjectChange;
  _onInsertImageInEditor = onInsertImageInEditor;

  document.querySelector('[data-action="add-doc"]')?.addEventListener('click', () => _addDocument('doc', null));
  document.querySelector('[data-action="add-folder"]')?.addEventListener('click', () => _addDocument('folder', null));
  document.querySelector('[data-action="add-image"]')?.addEventListener('click', _addImageItem);
  document.querySelector('[data-action="add-audio"]')?.addEventListener('click', _addAudioItem);
  document.querySelector('[data-action="add-character"]')?.addEventListener('click', _addCharacterTemplate);
  document.querySelector('[data-action="add-location"]')?.addEventListener('click', _addLocationTemplate);
  document.querySelector('[data-action="pin-binder"]')?.addEventListener('click', _togglePin);

  // Reflect initial pin state on load
  _refreshPinUI();
  if (_binderPinned) {
    document.getElementById('workspace')?.classList.add('binder-pinned');
  }

  // Add resize handle for when binder is pinned
  _initResizeHandle();

  _initContextMenu();
}

/** Return true when the binder is pinned open. */
export function isBinderPinned() { return _binderPinned; }

function _togglePin() {
  _binderPinned = !_binderPinned;
  localStorage.setItem('zp_binder_pinned', _binderPinned ? '1' : '0');
  _refreshPinUI();
  const ws = document.getElementById('workspace');
  if (ws) ws.classList.toggle('binder-pinned', _binderPinned);
}

function _refreshPinUI() {
  const btn = document.querySelector('[data-action="pin-binder"]');
  if (!btn) return;
  btn.classList.toggle('active', _binderPinned);
  btn.setAttribute('aria-pressed', _binderPinned ? 'true' : 'false');
  btn.title = _binderPinned ? 'Unpin Binder (keep open)' : 'Pin Binder (keep open)';
  btn.innerHTML = _binderPinned ? ICON.pin : ICON.pinSlash;
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

  // Expandable Trash section
  const trash = getTrash(project);
  if (trash.length) {
    const trashHeader = document.createElement('div');
    trashHeader.className = 'binder-trash-row';
    trashHeader.style.cursor = 'pointer';
    trashHeader.innerHTML =
      `<span class="binder-arrow">${_trashExpanded ? ICON.chevronDown : ICON.chevronRight}</span>` +
      `${ICON.trash}<span>Trash</span><span class="binder-trash-count">${trash.length}</span>`;
    trashHeader.addEventListener('click', () => {
      _trashExpanded = !_trashExpanded;
      renderBinder(_project, _currentDocId);
    });
    container.appendChild(trashHeader);

    if (_trashExpanded) {
      const trashList = document.createElement('ul');
      trashList.className = 'binder-list binder-trash-list';
      trash.forEach(doc => trashList.appendChild(_buildTrashItem(doc)));
      container.appendChild(trashList);
    }
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
  const isFolder  = doc.type === 'folder';
  const isImage   = doc.type === 'image';
  const isClip    = doc.type === 'clip';
  const isAudio   = doc.type === 'audio';
  const isSelected = doc.id === _currentDocId;
  const children  = isFolder ? getChildren(_project, doc.id) : [];

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
  if (isFolder) {
    icon.innerHTML = doc.collapsed ? ICON.folder : ICON.folderOpen;
  } else if (isImage) {
    icon.innerHTML = ICON.image;
  } else if (isClip) {
    icon.innerHTML = ICON.clip;
  } else if (isAudio) {
    icon.innerHTML = ICON.audio;
  } else {
    icon.innerHTML = ICON.doc;
  }

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

  // Label colour dot (visible when the doc has a label assigned)
  if (doc.label && LABEL_COLORS[doc.label]) {
    const labelDot = document.createElement('span');
    labelDot.className = 'binder-label-dot';
    labelDot.style.background = LABEL_COLORS[doc.label];
    labelDot.title = doc.label;
    row.appendChild(labelDot);
  }

  row.appendChild(actions);

  // Right-click → context menu
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    _showContextMenu(doc.id, e.clientX, e.clientY);
  });

  // Multi-select highlight
  if (_multiSelect.has(doc.id)) row.classList.add('multi-selected');

  // Events — image items open a lightbox; clips open the source URL; docs select into the editor
  const handleActivate = (e) => {
    // Shift+click for multi-select
    if (e?.shiftKey) {
      e.preventDefault();
      if (_multiSelect.has(doc.id)) {
        _multiSelect.delete(doc.id);
        row.classList.remove('multi-selected');
      } else {
        _multiSelect.add(doc.id);
        row.classList.add('multi-selected');
      }
      _updateMultiSelectBar();
      return;
    }
    // Clear multi-select on normal click
    if (_multiSelect.size) {
      _multiSelect.clear();
      document.querySelectorAll('.binder-item-row.multi-selected').forEach(el => el.classList.remove('multi-selected'));
      _updateMultiSelectBar();
    }
    if (isImage) return _showLightbox(doc);
    if (isAudio) return _showAudioPlayer(doc);
    if (isClip && doc.url) return window.open(doc.url, '_blank', 'noopener');
    _selectDocument(doc.id);
  };
  row.addEventListener('click', handleActivate);
  row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(e); } });
  titleSpan.addEventListener('dblclick', e => { e.stopPropagation(); _startRename(doc.id, titleSpan); });

  // Image items can be dragged into the editor to embed
  if (isImage && doc.imageData) {
    row.draggable = true;
    row.addEventListener('dragstart', e => {
      e.dataTransfer.setData('application/x-zeropro-image', doc.imageData);
      e.dataTransfer.setData('text/plain', doc.title);
      e.dataTransfer.effectAllowed = 'copy';
    });
  }

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

// ─── Context Menu ─────────────────────────────────────────────────────────────

function _initContextMenu() {
  _ctxMenu = document.createElement('div');
  _ctxMenu.id        = 'binder-ctx';
  _ctxMenu.className = 'ctx-menu hidden';
  document.body.appendChild(_ctxMenu);

  // Close on any click outside the menu
  document.addEventListener('click', () => _hideContextMenu());
}

function _showContextMenu(docId, x, y) {
  _ctxDocId = docId;
  const doc = getDocument(_project, docId);
  if (!doc) return;

  _ctxMenu.innerHTML = '';

  // Rename
  const renameBtn = _ctxItem('Rename', false, () => {
    const titleEl = document.querySelector(`.binder-item-row[data-doc-id="${docId}"] .binder-title`);
    if (titleEl) _startRename(docId, titleEl);
  });
  _ctxMenu.appendChild(renameBtn);

  // Insert in Editor (image items only)
  if (doc.type === 'image' && doc.imageData) {
    _ctxMenu.appendChild(_ctxItem('Insert in Editor', false, () => {
      _onInsertImageInEditor?.(doc.imageData, doc.title);
    }));
  }

  // Duplicate (docs only)
  if (doc.type === 'doc') {
    _ctxMenu.appendChild(_ctxItem('Duplicate', false, () => _duplicateDoc(docId)));
  }

  // Label section
  const sep1 = document.createElement('div');
  sep1.className = 'ctx-sep';
  _ctxMenu.appendChild(sep1);

  const labelRow = document.createElement('div');
  labelRow.className = 'ctx-label-row';

  const noneDot = document.createElement('button');
  noneDot.className = 'ctx-label-dot ctx-label-none';
  noneDot.title = 'No label';
  noneDot.addEventListener('click', e => { e.stopPropagation(); _setDocLabel(docId, null); _hideContextMenu(); });
  labelRow.appendChild(noneDot);

  Object.entries(LABEL_COLORS).forEach(([name, color]) => {
    const dot = document.createElement('button');
    dot.className = 'ctx-label-dot';
    dot.style.background = color;
    dot.title = name;
    dot.addEventListener('click', e => { e.stopPropagation(); _setDocLabel(docId, name); _hideContextMenu(); });
    labelRow.appendChild(dot);
  });
  _ctxMenu.appendChild(labelRow);

  // Trash
  const sep2 = document.createElement('div');
  sep2.className = 'ctx-sep';
  _ctxMenu.appendChild(sep2);
  _ctxMenu.appendChild(_ctxItem('Move to Trash', true, () => {
    trashDocument(_project, docId);
    if (_currentDocId === docId) {
      _currentDocId = null;
      _onSelectDoc?.(null);
    }
    saveProject(_project);
    renderBinder(_project, _currentDocId);
    _onProjectChange?.(_project);
    showToast('Moved to Trash');
  }));

  // Position — keep inside viewport
  _ctxMenu.classList.remove('hidden');
  const { offsetWidth: mw, offsetHeight: mh } = _ctxMenu;
  _ctxMenu.style.left = `${Math.min(x, window.innerWidth  - mw - 4)}px`;
  _ctxMenu.style.top  = `${Math.min(y, window.innerHeight - mh - 4)}px`;
}

function _hideContextMenu() {
  _ctxMenu?.classList.add('hidden');
  _ctxDocId = null;
}

function _ctxItem(label, isDanger, handler) {
  const btn = document.createElement('button');
  btn.className   = `ctx-item${isDanger ? ' ctx-danger' : ''}`;
  btn.textContent = label;
  btn.addEventListener('click', e => { e.stopPropagation(); _hideContextMenu(); handler(); });
  return btn;
}

function _setDocLabel(docId, label) {
  const doc = getDocument(_project, docId);
  if (!doc) return;
  updateDocument(_project, docId, { label });
  saveProject(_project);
  renderBinder(_project, _currentDocId);
  _onProjectChange?.(_project);
}

function _duplicateDoc(id) {
  const doc = getDocument(_project, id);
  if (!doc || doc.type === 'folder') return;

  // Deep-copy the document, assign a new ID and title
  const copy = JSON.parse(JSON.stringify(doc));
  copy.id         = generateId();
  copy.title      = `${doc.title} (Copy)`;
  copy.createdAt  = Date.now();
  copy.updatedAt  = Date.now();
  copy.order      = doc.order + 0.5;

  _project.documents.push(copy);

  // Normalise order values for siblings
  const siblings = getChildren(_project, doc.parentId);
  siblings.sort((a, b) => a.order - b.order).forEach((d, i) => { d.order = i; });

  saveProject(_project);
  renderBinder(_project, _currentDocId);
  _onProjectChange?.(_project);
  showToast(`"${doc.title}" duplicated`);
}

// ─── Trash Items ──────────────────────────────────────────────────────────────

function _buildTrashItem(doc) {
  const isImage  = doc.type === 'image';
  const isFolder = doc.type === 'folder';
  const isClip   = doc.type === 'clip';

  const li = document.createElement('li');
  li.className = 'binder-item binder-trash-item';
  li.dataset.docId = doc.id;

  const row = document.createElement('div');
  row.className = 'binder-item-row trash-row';
  row.dataset.docId = doc.id;
  row.setAttribute('tabindex', '0');

  const spacer = document.createElement('span');
  spacer.className = 'binder-arrow';

  const icon = document.createElement('span');
  icon.className = 'binder-icon';
  icon.innerHTML = isFolder ? ICON.folder : isImage ? ICON.image : isClip ? ICON.clip : ICON.doc;

  const titleSpan = document.createElement('span');
  titleSpan.className = 'binder-title';
  titleSpan.textContent = doc.title;

  row.appendChild(spacer);
  row.appendChild(icon);
  row.appendChild(titleSpan);

  // Click to view — images get lightbox, docs get selected into editor
  row.addEventListener('click', () => {
    if (isImage) _showLightbox(doc);
    else _selectDocument(doc.id);
  });
  row.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isImage) _showLightbox(doc);
      else _selectDocument(doc.id);
    }
  });

  // Right-click → trash context menu (restore / move to folder / delete permanently)
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    _showTrashContextMenu(doc.id, e.clientX, e.clientY);
  });

  li.appendChild(row);
  return li;
}

function _showTrashContextMenu(docId, x, y) {
  _ctxDocId = docId;
  const doc = getDocument(_project, docId);
  if (!doc) return;

  _ctxMenu.innerHTML = '';

  // Restore to root
  _ctxMenu.appendChild(_ctxItem('Restore to Binder', false, () => {
    _restoreDocTo(docId, null);
  }));

  // List all non-trash folders the user can restore into
  const folders = _project.documents.filter(d => d.type === 'folder' && !d.inTrash);
  if (folders.length) {
    const sep = document.createElement('div');
    sep.className = 'ctx-sep';
    _ctxMenu.appendChild(sep);

    const label = document.createElement('div');
    label.className = 'ctx-section-label';
    label.textContent = 'Move to folder';
    _ctxMenu.appendChild(label);

    folders.forEach(f => {
      _ctxMenu.appendChild(_ctxItem(f.title, false, () => {
        _restoreDocTo(docId, f.id);
      }));
    });
  }

  // Permanent delete
  const sep2 = document.createElement('div');
  sep2.className = 'ctx-sep';
  _ctxMenu.appendChild(sep2);
  _ctxMenu.appendChild(_ctxItem('Delete Permanently', true, () => {
    purgeDocument(_project, docId);
    if (_currentDocId === docId) {
      _currentDocId = null;
      _onSelectDoc?.(null);
    }
    saveProject(_project);
    renderBinder(_project, _currentDocId);
    _onProjectChange?.(_project);
    showToast('Permanently deleted');
  }));

  // Position — keep inside viewport
  _ctxMenu.classList.remove('hidden');
  const { offsetWidth: mw, offsetHeight: mh } = _ctxMenu;
  _ctxMenu.style.left = `${Math.min(x, window.innerWidth  - mw - 4)}px`;
  _ctxMenu.style.top  = `${Math.min(y, window.innerHeight - mh - 4)}px`;
}

function _restoreDocTo(docId, parentId) {
  restoreDocument(_project, docId);
  updateDocument(_project, docId, { parentId });
  // Re-order at end of target folder's children
  const siblings = getChildren(_project, parentId);
  const maxOrder = siblings.length ? Math.max(...siblings.map(d => d.order)) : -1;
  updateDocument(_project, docId, { order: maxOrder + 1 });
  saveProject(_project);
  renderBinder(_project, _currentDocId);
  _onProjectChange?.(_project);
  const dest = parentId ? getDocument(_project, parentId)?.title : 'Binder';
  showToast(`Restored to ${dest}`);
}

// ─── Research Folder ──────────────────────────────────────────────────────────

/** Find or create the "Research" folder used to hold images and clips */
function _ensureResearchFolder() {
  let folder = _project.documents.find(d => d.type === 'folder' && d.title === 'Research' && !d.inTrash);
  if (!folder) {
    folder = createDocument(_project, { type: 'folder', parentId: null, title: 'Research' });
  }
  return folder;
}

// ─── Image Items ──────────────────────────────────────────────────────────────

function _addImageItem() {
  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', () => {
    const file = input.files[0];
    document.body.removeChild(input);
    if (!file) return;

    const researchFolder = _ensureResearchFolder();
    const reader   = new FileReader();
    reader.onload  = e => {
      const doc = createDocument(_project, {
        type:     'image',
        parentId: researchFolder.id,
        title:    file.name.replace(/\.[^.]+$/, ''),
      });
      doc.imageData = e.target.result;
      saveProject(_project);
      renderBinder(_project, _currentDocId);
      _onProjectChange?.(_project);
      showToast(`Image "${doc.title}" added to Research`);
    };
    reader.readAsDataURL(file);
  });

  input.click();
}

function _showLightbox(doc) {
  if (!doc.imageData) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', doc.title);
  backdrop.innerHTML = `
    <div class="lightbox">
      <button class="lightbox-close" aria-label="Close lightbox">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/></svg>
      </button>
      <img src="${doc.imageData}" alt="${_esc(doc.title)}" class="lightbox-img">
      <div class="lightbox-caption">${_esc(doc.title)}${doc.synopsis ? ` — ${_esc(doc.synopsis)}` : ''}</div>
    </div>
  `;

  document.body.appendChild(backdrop);
  backdrop.querySelector('.lightbox-close').focus();

  const close = () => document.body.removeChild(backdrop);
  backdrop.querySelector('.lightbox-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

// ─── Audio Items ──────────────────────────────────────────────────────────────

const AUDIO_ACCEPT = 'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac,audio/mp4,audio/x-m4a,.mp3,.wav,.ogg,.flac,.aac,.m4a';
const AUDIO_SIZE_LIMIT_MB = 20;

function _addAudioItem() {
  const input    = document.createElement('input');
  input.type     = 'file';
  input.accept   = AUDIO_ACCEPT;
  input.multiple = true;
  input.style.display = 'none';
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const files = Array.from(input.files);
    document.body.removeChild(input);
    if (!files.length) return;

    const researchFolder = _ensureResearchFolder();

    for (const file of files) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > AUDIO_SIZE_LIMIT_MB) {
        showToast(`"${file.name}" is too large (max ${AUDIO_SIZE_LIMIT_MB} MB)`);
        continue;
      }

      const audioData = await new Promise(res => {
        const reader  = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsDataURL(file);
      });

      const doc = createDocument(_project, {
        type:     'audio',
        parentId: researchFolder.id,
        title:    file.name.replace(/\.[^.]+$/, ''),
      });
      doc.audioData = audioData;
      doc.audioMime = file.type || 'audio/mpeg';
      doc.tags      = [];
      saveProject(_project);
      showToast(`"${doc.title}" added to Research`);
    }

    renderBinder(_project, _currentDocId);
    _onProjectChange?.(_project);
  });

  input.click();
}

function _showAudioPlayer(doc) {
  if (!doc.audioData) { showToast('No audio data'); return; }

  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop audio-player-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', `Audio: ${doc.title}`);

  const tagList = (doc.tags || []).map(t =>
    `<span class="audio-tag" data-tag="${_esc(t)}">${_esc(t)} <button class="audio-tag-remove" aria-label="Remove tag ${_esc(t)}">×</button></span>`
  ).join('');

  backdrop.innerHTML = `
    <div class="audio-player-modal">
      <button class="lightbox-close" aria-label="Close player">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/></svg>
      </button>
      <div class="audio-player-icon">🎵</div>
      <div class="audio-player-title">${_esc(doc.title)}</div>
      <audio class="audio-player-el" controls src="${doc.audioData}"></audio>
      <div class="audio-tags-section">
        <div class="audio-tags-label">Labels / Tags</div>
        <div class="audio-tags-list" id="audio-tags-list-${doc.id}">${tagList}</div>
        <div class="audio-tag-input-row">
          <input class="audio-tag-input" id="audio-tag-input" type="text"
                 placeholder="Add a tag…" aria-label="New tag">
          <button class="btn btn-primary audio-tag-add-btn" id="audio-tag-add-btn">Add</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  backdrop.querySelector('.lightbox-close').focus();

  const close = () => {
    document.body.removeChild(backdrop);
    document.removeEventListener('keydown', onKey);
  };
  backdrop.querySelector('.lightbox-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  // Tag management
  const tagInput = backdrop.querySelector('#audio-tag-input');
  const tagList2 = backdrop.querySelector(`#audio-tags-list-${doc.id}`);

  const _addTag = () => {
    const tag = tagInput.value.trim();
    if (!tag || (doc.tags || []).includes(tag)) { tagInput.value = ''; return; }
    doc.tags = [...(doc.tags || []), tag];
    saveProject(_project);
    _onProjectChange?.(_project);
    tagInput.value = '';
    _rerenderTags();
  };

  const _rerenderTags = () => {
    tagList2.innerHTML = (doc.tags || []).map(t =>
      `<span class="audio-tag" data-tag="${_esc(t)}">${_esc(t)} <button class="audio-tag-remove" aria-label="Remove tag ${_esc(t)}">×</button></span>`
    ).join('');
    tagList2.querySelectorAll('.audio-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.closest('.audio-tag').dataset.tag;
        doc.tags = (doc.tags || []).filter(x => x !== t);
        saveProject(_project);
        _onProjectChange?.(_project);
        _rerenderTags();
      });
    });
  };

  backdrop.querySelector('#audio-tag-add-btn').addEventListener('click', _addTag);
  tagInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _addTag(); } });
  _rerenderTags();
}

// ─── Multi-Select ─────────────────────────────────────────────────────────────

function _updateMultiSelectBar() {
  let bar = document.getElementById('binder-multiselect-bar');
  if (!_multiSelect.size) {
    bar?.remove();
    return;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'binder-multiselect-bar';
    bar.className = 'binder-multiselect-bar';
    const binderEl = document.getElementById('binder');
    if (binderEl) binderEl.appendChild(bar);
  }

  bar.innerHTML = `
    <span class="multi-count">${_multiSelect.size} selected</span>
    <button class="multi-btn" data-action="label">Label</button>
    <button class="multi-btn" data-action="trash">Trash</button>
    <button class="multi-btn" data-action="clear">Clear</button>
  `;

  bar.querySelector('[data-action="label"]').addEventListener('click', _bulkLabel);
  bar.querySelector('[data-action="trash"]').addEventListener('click', _bulkTrash);
  bar.querySelector('[data-action="clear"]').addEventListener('click', () => {
    _multiSelect.clear();
    document.querySelectorAll('.binder-item-row.multi-selected').forEach(el => el.classList.remove('multi-selected'));
    _updateMultiSelectBar();
  });
}

function _bulkLabel() {
  // Show a small label picker for bulk label assignment
  const bar = document.getElementById('binder-multiselect-bar');
  if (!bar) return;

  let picker = bar.querySelector('.multi-label-picker');
  if (picker) { picker.remove(); return; }

  picker = document.createElement('div');
  picker.className = 'multi-label-picker';

  const noneDot = document.createElement('button');
  noneDot.className = 'ctx-label-dot ctx-label-none';
  noneDot.title = 'Remove label';
  noneDot.addEventListener('click', () => { _applyBulkLabel(null); picker.remove(); });
  picker.appendChild(noneDot);

  Object.entries(LABEL_COLORS).forEach(([name, color]) => {
    const dot = document.createElement('button');
    dot.className = 'ctx-label-dot';
    dot.style.background = color;
    dot.title = name;
    dot.addEventListener('click', () => { _applyBulkLabel(name); picker.remove(); });
    picker.appendChild(dot);
  });

  bar.appendChild(picker);
}

function _applyBulkLabel(label) {
  _multiSelect.forEach(id => {
    updateDocument(_project, id, { label });
  });
  saveProject(_project);
  _multiSelect.clear();
  renderBinder(_project, _currentDocId);
  _onProjectChange?.(_project);
  _updateMultiSelectBar();
  showToast(label ? `Label "${label}" applied` : 'Labels removed');
}

function _bulkTrash() {
  _multiSelect.forEach(id => {
    trashDocument(_project, id);
    if (_currentDocId === id) {
      _currentDocId = null;
      _onSelectDoc?.(null);
    }
  });
  saveProject(_project);
  _multiSelect.clear();
  renderBinder(_project, _currentDocId);
  _onProjectChange?.(_project);
  _updateMultiSelectBar();
  showToast('Moved to Trash');
}

// ─── Sidebar Resize Handle ────────────────────────────────────────────────────

function _initResizeHandle() {
  const binderEl = document.getElementById('binder');
  if (!binderEl) return;

  const handle = document.createElement('div');
  handle.className = 'binder-resize-handle';
  handle.setAttribute('aria-hidden', 'true');
  handle.title = 'Drag to resize binder';
  binderEl.appendChild(handle);

  let _dragging = false;
  let _startX   = 0;
  let _startW   = 0;

  handle.addEventListener('mousedown', e => {
    if (!_binderPinned) return;
    e.preventDefault();
    _dragging = true;
    _startX   = e.clientX;
    _startW   = parseInt(getComputedStyle(document.documentElement)
                  .getPropertyValue('--binder-w') || '240', 10);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!_dragging) return;
    const delta = e.clientX - _startX;
    const newW  = Math.max(160, Math.min(480, _startW + delta));
    document.documentElement.style.setProperty('--binder-w', `${newW}px`);
  });

  document.addEventListener('mouseup', () => {
    if (!_dragging) return;
    _dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Persist
    const w = getComputedStyle(document.documentElement).getPropertyValue('--binder-w').trim();
    localStorage.setItem('zp_binder_w', w);
  });

  // Restore saved width
  const savedW = localStorage.getItem('zp_binder_w');
  if (savedW) document.documentElement.style.setProperty('--binder-w', savedW);
}

// ─── Character Template ────────────────────────────────────────────────────────

function _addCharacterTemplate() {
  if (!_project) return;
  let researchFolder = _project.documents.find(
    d => d.type === 'folder' && d.title === 'Characters' && !d.inTrash
  );
  if (!researchFolder) {
    researchFolder = createDocument(_project, { type: 'folder', parentId: null, title: 'Characters' });
  }

  const doc = createDocument(_project, {
    type: 'doc',
    parentId: researchFolder.id,
    title: 'New Character',
  });

  doc.content = `<h2>Character Sheet</h2>
<h3>Basic Info</h3>
<p><strong>Full Name:</strong> </p>
<p><strong>Nickname / Alias:</strong> </p>
<p><strong>Age:</strong> </p>
<p><strong>Gender / Pronouns:</strong> </p>
<p><strong>Occupation:</strong> </p>
<h3>Appearance</h3>
<p><strong>Height / Build:</strong> </p>
<p><strong>Hair &amp; Eyes:</strong> </p>
<p><strong>Distinguishing features:</strong> </p>
<h3>Personality</h3>
<p><strong>Core traits:</strong> </p>
<p><strong>Greatest strength:</strong> </p>
<p><strong>Fatal flaw:</strong> </p>
<p><strong>Fears:</strong> </p>
<p><strong>Desires / Goals:</strong> </p>
<h3>Background</h3>
<p><strong>Backstory:</strong> </p>
<p><strong>Key relationships:</strong> </p>
<h3>Story Role</h3>
<p><strong>Arc:</strong> </p>
<p><strong>Notes:</strong> </p>`;

  saveProject(_project);
  renderBinder(_project, _currentDocId);
  _onProjectChange?.(_project);
  _onSelectDoc?.(doc.id);
  showToast('Character sheet created');
}

// ─── Location Template ────────────────────────────────────────────────────────

function _addLocationTemplate() {
  if (!_project) return;
  let locationFolder = _project.documents.find(
    d => d.type === 'folder' && d.title === 'Locations' && !d.inTrash
  );
  if (!locationFolder) {
    locationFolder = createDocument(_project, { type: 'folder', parentId: null, title: 'Locations' });
  }

  const doc = createDocument(_project, {
    type: 'doc',
    parentId: locationFolder.id,
    title: 'New Location',
  });

  doc.content = `<h2>Location Sheet</h2>
<h3>Overview</h3>
<p><strong>Name:</strong> </p>
<p><strong>Type:</strong> (city / building / wilderness / other)</p>
<p><strong>Region / Country:</strong> </p>
<p><strong>Time period:</strong> </p>
<h3>Description</h3>
<p><strong>First impression:</strong> </p>
<p><strong>Sights:</strong> </p>
<p><strong>Sounds:</strong> </p>
<p><strong>Smells:</strong> </p>
<p><strong>Atmosphere / Mood:</strong> </p>
<h3>Details</h3>
<p><strong>Key features / landmarks:</strong> </p>
<p><strong>Who lives / works here:</strong> </p>
<p><strong>Secrets or hidden aspects:</strong> </p>
<h3>Story Significance</h3>
<p><strong>Scenes set here:</strong> </p>
<p><strong>Symbolic meaning:</strong> </p>
<p><strong>Notes:</strong> </p>`;

  saveProject(_project);
  renderBinder(_project, _currentDocId);
  _onProjectChange?.(_project);
  _onSelectDoc?.(doc.id);
  showToast('Location sheet created');
}

function _esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
