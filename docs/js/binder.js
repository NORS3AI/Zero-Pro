// binder.js — Document tree (Binder) rendering and interaction

import {
  getChildren, getDocument, getTrash,
  createDocument, updateDocument, trashDocument,
  reorderDocuments, saveProject, generateId,
} from './storage.js';
import { showConfirm, showToast } from './ui.js';
import { LABEL_COLORS } from './corkboard.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _project = null;
let _currentDocId = null;
let _onSelectDoc = null;
let _onProjectChange = null;
let _sortableInstances = [];
let _ctxMenu  = null;   // context menu element (singleton)
let _ctxDocId = null;   // doc ID targeted by current context menu

// ─── SVG Icon Strings ─────────────────────────────────────────────────────────

const ICON = {
  doc: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.5L9.5 0H4zm5.5 1v4h4L9.5 1z"/></svg>`,
  folder: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"/></svg>`,
  folderOpen: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5zm1.5-.5a.5.5 0 0 0-.5.5v2.5h13V5.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5z"/></svg>`,
  image: `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>`,
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
  document.querySelector('[data-action="add-image"]')?.addEventListener('click', _addImageItem);

  _initContextMenu();
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
  const isFolder  = doc.type === 'folder';
  const isImage   = doc.type === 'image';
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

  // Events — image items open a lightbox; other items select into the editor
  const handleActivate = () => isImage ? _showLightbox(doc) : _selectDocument(doc.id);
  row.addEventListener('click', handleActivate);
  row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } });
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

    const reader   = new FileReader();
    reader.onload  = e => {
      const doc = createDocument(_project, {
        type:  'image',
        title: file.name.replace(/\.[^.]+$/, ''),
      });
      doc.imageData = e.target.result;
      saveProject(_project);
      renderBinder(_project, _currentDocId);
      _onProjectChange?.(_project);
      showToast(`Image "${doc.title}" added to Binder`);
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

function _esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
