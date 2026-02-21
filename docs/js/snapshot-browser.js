// snapshot-browser.js — Global Snapshot Browser + paragraph-level restore (Phase 10)
// Lists every snapshot across all documents. Full-text search. Click any paragraph
// in a snapshot preview to restore just that paragraph into the active document.

import { getDocument, saveProject } from './storage.js';
import { showToast, showConfirm } from './ui.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject    = null;
let _getCurrentDoc = null;
let _onDocRestore  = null;
let _modal         = null;
let _selectedSnap  = null; // { snap, doc }

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the snapshot browser. Call once at app boot.
 * @param {{ getProject: Function, getCurrentDoc: Function, onDocRestore: Function }} opts
 */
export function initSnapshotBrowser({ getProject, getCurrentDoc, onDocRestore }) {
  _getProject    = getProject;
  _getCurrentDoc = getCurrentDoc;
  _onDocRestore  = onDocRestore;
}

/** Open the global snapshot browser modal. */
export function openSnapshotBrowser() {
  const project = _getProject?.();
  if (!project) return;

  if (!_modal) {
    _modal = _buildModal();
    document.body.appendChild(_modal);
  }

  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _renderList(project, '');
}

// ─── Modal Construction ───────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'sb-overlay';
  overlay.className = 'sb-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Snapshot Browser');

  overlay.innerHTML = `
    <div class="sb-modal">
      <div class="sb-header">
        <h3 class="sb-title">Snapshot Browser</h3>
        <button class="sb-close" aria-label="Close">&times;</button>
      </div>
      <div class="sb-body">
        <!-- Left: list + search -->
        <div class="sb-list-col">
          <div class="sb-search-wrap">
            <input type="search" id="sb-search" class="sb-search-input"
                   placeholder="Search snapshots…" aria-label="Search snapshots">
          </div>
          <div class="sb-list" id="sb-list" role="listbox" aria-label="Snapshots"></div>
        </div>
        <!-- Right: preview -->
        <div class="sb-preview-col">
          <div class="sb-preview-header" id="sb-preview-header">
            <span class="sb-preview-title">Select a snapshot to preview</span>
            <span class="sb-preview-hint"></span>
          </div>
          <div class="sb-preview-content" id="sb-preview-content">
            <p class="sb-empty-state">Click a snapshot on the left to preview its content.<br>
            Click any paragraph to restore just that paragraph into the current document.</p>
          </div>
        </div>
      </div>
    </div>`;

  overlay.querySelector('.sb-close').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  overlay.querySelector('#sb-search').addEventListener('input', e => {
    const project = _getProject?.();
    if (project) _renderList(project, e.target.value.trim().toLowerCase());
  });

  return overlay;
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  _selectedSnap = null;
}

// ─── List Rendering ───────────────────────────────────────────────────────────

function _renderList(project, query) {
  const list = document.getElementById('sb-list');
  if (!list) return;

  // Collect all snapshots from all docs
  const entries = _allSnapshots(project, query);

  if (!entries.length) {
    list.innerHTML = `<p class="sb-empty-state">${query ? 'No snapshots match your search.' : 'No snapshots found. Take snapshots while editing to build your revision history.'}</p>`;
    return;
  }

  list.innerHTML = '';
  entries.forEach(({ snap, doc }) => {
    const item = document.createElement('div');
    item.className = 'sb-item';
    item.setAttribute('role', 'option');
    item.dataset.snapId = snap.id;
    item.dataset.docId  = doc.id;

    const date    = new Date(snap.createdAt);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const nameHtml = query ? _highlight(snap.name, query) : _esc(snap.name);
    const docHtml  = query ? _highlight(doc.title || 'Untitled', query) : _esc(doc.title || 'Untitled');

    item.innerHTML = `
      <div class="sb-item-name">${nameHtml}</div>
      <div class="sb-item-doc">${docHtml}</div>
      <div class="sb-item-meta">${dateStr} ${timeStr} &mdash; ${snap.wordCount.toLocaleString()} words</div>`;

    item.addEventListener('click', () => {
      list.querySelectorAll('.sb-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      _selectedSnap = { snap, doc };
      _renderPreview(snap, doc, query);
    });

    list.appendChild(item);
  });
}

// ─── Preview Rendering ────────────────────────────────────────────────────────

function _renderPreview(snap, doc, query = '') {
  const headerEl  = document.getElementById('sb-preview-header');
  const contentEl = document.getElementById('sb-preview-content');
  if (!headerEl || !contentEl) return;

  const date    = new Date(snap.createdAt);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  headerEl.innerHTML = `
    <div>
      <span class="sb-preview-title">${_esc(snap.name)}</span>
      <span class="sb-preview-doc-label">from "${_esc(doc.title || 'Untitled')}"</span>
    </div>
    <div class="sb-preview-actions">
      <span class="sb-preview-date">${dateStr}</span>
      <button class="btn btn-sm" id="sb-btn-restore-all" title="Restore this snapshot as the full document content">Restore All</button>
    </div>`;

  document.getElementById('sb-btn-restore-all')?.addEventListener('click', () => {
    const cur = _getCurrentDoc?.();
    if (!cur || cur.type !== 'doc') {
      showToast('Select a document in the editor first');
      return;
    }
    showConfirm(`Replace "${cur.title}"'s content with snapshot "${snap.name}"?`, () => {
      cur.content = snap.content;
      saveProject(_getProject?.());
      _onDocRestore?.(cur.id);
      showToast('Snapshot restored');
      _close();
    });
  });

  // Split snapshot content into block paragraphs
  const blocks = _splitBlocks(snap.content);
  contentEl.innerHTML = '';

  if (!blocks.length) {
    contentEl.innerHTML = '<p class="sb-empty-state">This snapshot is empty.</p>';
    return;
  }

  const hint = document.createElement('p');
  hint.className = 'sb-para-hint';
  hint.textContent = 'Click any paragraph to insert it into the current document.';
  contentEl.appendChild(hint);

  blocks.forEach((html, i) => {
    const block = document.createElement('div');
    block.className = 'sb-para-block';
    block.setAttribute('role', 'button');
    block.setAttribute('tabindex', '0');
    block.setAttribute('title', 'Click to restore this paragraph');

    const text = _stripTags(html);
    const displayHtml = query ? _highlight(text, query) : _esc(text);
    block.innerHTML = `<span class="sb-para-text">${displayHtml}</span>
      <span class="sb-para-badge">Insert</span>`;

    block.addEventListener('click', () => _restoreParagraph(html));
    block.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _restoreParagraph(html); }
    });

    contentEl.appendChild(block);
  });
}

// ─── Paragraph Restore ────────────────────────────────────────────────────────

function _restoreParagraph(paragraphHtml) {
  const cur = _getCurrentDoc?.();
  if (!cur || cur.type !== 'doc') {
    showToast('Select a document in the editor first');
    return;
  }

  // Try to insert at cursor in the contenteditable editor
  const editor = document.getElementById('editor');
  if (editor) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);

      // Create a temporary container and extract nodes
      const tmp = document.createElement('div');
      tmp.innerHTML = paragraphHtml;
      const frag = document.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      range.insertNode(frag);
      sel.collapseToEnd();
      showToast('Paragraph inserted at cursor');
    } else {
      // No cursor in editor — append at end
      editor.insertAdjacentHTML('beforeend', paragraphHtml);
      showToast('Paragraph appended to document');
    }

    // Trigger a save
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    showToast('Open the editor view to restore a paragraph');
  }
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────

/** Collect all snapshots across the project, optionally filtered by query. */
function _allSnapshots(project, query) {
  const entries = [];
  (project.documents || []).forEach(doc => {
    if (doc.type !== 'doc' || doc.inTrash || !doc.snapshots?.length) return;
    doc.snapshots.forEach(snap => {
      if (!query) {
        entries.push({ snap, doc });
        return;
      }
      // Filter: match name, doc title, or snapshot plain text
      const haystack = [snap.name, doc.title || '', _stripTags(snap.content || '')].join(' ').toLowerCase();
      if (haystack.includes(query)) entries.push({ snap, doc });
    });
  });
  // Sort newest first
  entries.sort((a, b) => b.snap.createdAt - a.snap.createdAt);
  return entries;
}

/** Split an HTML string into block-level elements. */
function _splitBlocks(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';

  const blocks = [];
  tmp.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const text = (node.textContent || '').trim();
      if (text) blocks.push(node.outerHTML);
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').trim();
      if (text) blocks.push(`<p>${_esc(text)}</p>`);
    }
  });

  return blocks;
}

function _stripTags(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || '').trim();
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Wrap query matches in <mark> tags for highlighting. */
function _highlight(text, query) {
  if (!query) return _esc(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  return _esc(text).replace(re, '<mark>$1</mark>');
}
