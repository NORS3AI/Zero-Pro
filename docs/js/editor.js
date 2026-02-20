// editor.js — Rich text editor: formatting, autosave, word count, focus mode, images
// Phase 6: Image Import & Media Support

import { updateDocument, saveProjectDebounced, countWords } from './storage.js';
import { showToast, showPrompt } from './ui.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _project     = null;
let _currentDoc  = null;
let _onDocChange = null;
let _focusMode   = false;
let _selectedImg = null;   // currently-selected <img> inside the editor
let _sizeWarned  = false;  // show large-doc warning at most once per document load

// ─── DOM Shortcuts ────────────────────────────────────────────────────────────

const el = id => document.getElementById(id);

// ─── Public API ───────────────────────────────────────────────────────────────

/** Wire up all editor events. Call once at app init. */
export function initEditor({ onDocChange }) {
  _onDocChange = onDocChange;

  const editor = el('editor');
  if (!editor) return;

  editor.addEventListener('input',    _handleInput);
  editor.addEventListener('keydown',  _handleKeydown);
  editor.addEventListener('keyup',    _updateFocusHighlight);
  editor.addEventListener('mouseup',  _updateFocusHighlight);
  editor.addEventListener('paste',    _handlePaste);

  // Image interactions
  editor.addEventListener('click',    _handleEditorClick);
  editor.addEventListener('dragover', _handleDragOver);
  editor.addEventListener('drop',     _handleImageDrop);

  // Toolbar format buttons (data-format attribute)
  document.querySelectorAll('[data-format]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent editor losing focus
      _applyFormat(btn.dataset.format);
    });
  });

  // Track selection changes to update toolbar state
  document.addEventListener('selectionchange', _updateToolbar);

  // Hide image toolbar when clicking outside both editor and toolbar
  document.addEventListener('click', e => {
    if (!e.target.closest('#img-toolbar') && e.target !== _selectedImg) {
      _hideImageToolbar();
    }
  });

  // Wire "Insert Image" toolbar button → hidden <input type="file">
  _initImageInput();
}

/** Load a document into the editor */
export function loadDocument(project, doc) {
  _project    = project;
  _currentDoc = doc;
  _sizeWarned = false;
  _hideImageToolbar();

  const editor      = el('editor');
  const placeholder = el('editor-placeholder');
  const toolbar     = el('editor-toolbar');

  if (!editor) return;

  if (doc && doc.type === 'doc') {
    editor.innerHTML       = doc.content || '<p></p>';
    editor.contentEditable = 'true';
    editor.setAttribute('aria-label', doc.title);
    editor.classList.remove('empty');
    toolbar?.classList.remove('hidden');
    _moveCursorToStart(editor);
    _updateWritingPlaceholder();
  } else {
    editor.innerHTML       = '';
    editor.contentEditable = 'false';
    editor.classList.add('empty');
    toolbar?.classList.add('hidden');
    if (placeholder) {
      placeholder.classList.remove('hidden');
      placeholder.textContent = doc?.type === 'folder'
        ? `${doc.title} — Folder`
        : 'Select or create a document to start writing.';
    }
  }

  _updateWordCountDisplay();
}

/** Force-save the current editor content immediately */
export function saveCurrentContent() {
  if (!_project || !_currentDoc || _currentDoc.type !== 'doc') return;
  const editor = el('editor');
  if (!editor) return;

  // Clone and strip find-replace highlight marks before persisting
  const clone = editor.cloneNode(true);
  clone.querySelectorAll('mark.fr-highlight').forEach(mark => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });

  const content   = clone.innerHTML;
  const wordCount = countWords(editor.innerText || '');
  updateDocument(_project, _currentDoc.id, { content, wordCount });
  _currentDoc.content   = content;
  _currentDoc.wordCount = wordCount;

  saveProjectDebounced(_project);
  _onDocChange?.(_project, _currentDoc);
  _updateWordCountDisplay();
  _checkDocumentSize(content.length);
}

/** Toggle focus/typewriter mode; returns the new state */
export function toggleFocusMode() {
  _focusMode = !_focusMode;
  el('editor-pane')?.classList.toggle('focus-mode', _focusMode);
  if (!_focusMode) {
    el('editor')?.querySelectorAll('.dimmed').forEach(n => n.classList.remove('dimmed'));
  } else {
    _updateFocusHighlight();
  }
  return _focusMode;
}

// ─── Internal Handlers ────────────────────────────────────────────────────────

function _handleInput() {
  _updateWritingPlaceholder();
  saveCurrentContent();
}

function _updateWritingPlaceholder() {
  const editor      = el('editor');
  const placeholder = el('editor-placeholder');
  if (!editor || !placeholder) return;
  const hasText = (editor.innerText || '').trim().length > 0;
  placeholder.textContent = hasText ? '' : 'Begin your story here…';
  placeholder.classList.toggle('hidden', hasText);
}

function _handlePaste(e) {
  // Prioritise image data in clipboard
  const items   = Array.from(e.clipboardData?.items || []);
  const imgItem = items.find(i => i.type.startsWith('image/'));
  if (imgItem) {
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (file) _readAndInsert(file);
    return;
  }

  // Plain-text paste — preserve paragraphs, strip HTML
  e.preventDefault();
  const text = e.clipboardData?.getData('text/plain') ?? '';
  if (!text) return;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (i > 0) document.execCommand('insertParagraph');
    if (line)  document.execCommand('insertText', false, line);
  });
}

function _handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'b') { e.preventDefault(); _applyFormat('bold'); }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'i') { e.preventDefault(); _applyFormat('italic'); }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'u') { e.preventDefault(); _applyFormat('underline'); }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.execCommand('insertParagraph');
  }
  // Delete/Backspace removes a selected image
  if ((e.key === 'Delete' || e.key === 'Backspace') && _selectedImg) {
    e.preventDefault();
    _selectedImg.remove();
    _hideImageToolbar();
    saveCurrentContent();
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function _applyFormat(format) {
  const editor = el('editor');
  if (!editor || editor.contentEditable !== 'true') return;
  editor.focus();

  switch (format) {
    case 'bold':          document.execCommand('bold'); break;
    case 'italic':        document.execCommand('italic'); break;
    case 'underline':     document.execCommand('underline'); break;
    case 'strikethrough': document.execCommand('strikeThrough'); break;
    case 'h1': document.execCommand('formatBlock', false, 'H1'); break;
    case 'h2': document.execCommand('formatBlock', false, 'H2'); break;
    case 'h3': document.execCommand('formatBlock', false, 'H3'); break;
    case 'p':  document.execCommand('formatBlock', false, 'P'); break;
  }
  _updateToolbar();
}

function _updateToolbar() {
  ['bold', 'italic', 'underline', 'strikethrough'].forEach(fmt => {
    const btn = document.querySelector(`[data-format="${fmt}"]`);
    if (!btn) return;
    const state = fmt === 'strikethrough'
      ? document.queryCommandState('strikeThrough')
      : document.queryCommandState(fmt);
    btn.classList.toggle('active', state);
    btn.setAttribute('aria-pressed', state ? 'true' : 'false');
  });
}

// ─── Word Count ───────────────────────────────────────────────────────────────

function _updateWordCountDisplay() {
  const wcEl   = el('word-count');
  const projEl = el('project-word-count');

  if (wcEl) {
    const n = _currentDoc?.wordCount ?? 0;
    wcEl.textContent = `${n.toLocaleString()} ${n === 1 ? 'word' : 'words'}`;
  }

  if (projEl && _project) {
    const total = _project.documents
      .filter(d => !d.inTrash && d.type === 'doc')
      .reduce((s, d) => s + (d.wordCount || 0), 0);
    projEl.textContent = total ? `${total.toLocaleString()} total` : '';
  }
}

// ─── Focus Mode ───────────────────────────────────────────────────────────────

function _updateFocusHighlight() {
  if (!_focusMode) return;
  const editor = el('editor');
  if (!editor) return;

  const sel = window.getSelection();
  if (!sel?.rangeCount) return;

  let node = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== editor && !['P', 'H1', 'H2', 'H3', 'LI', 'BLOCKQUOTE'].includes(node.nodeName)) {
    node = node.parentNode;
  }

  editor.querySelectorAll('p, h1, h2, h3, li, blockquote').forEach(el => {
    el.classList.toggle('dimmed', el !== node);
  });
}

// ─── Image Insertion ──────────────────────────────────────────────────────────

/** Create hidden file input wired to the toolbar's "Insert Image" button */
function _initImageInput() {
  const btn = el('btn-insert-image');
  if (!btn) return;

  const input  = document.createElement('input');
  input.type   = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.style.display = 'none';
  document.body.appendChild(input);

  btn.addEventListener('mousedown', e => e.preventDefault());
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    Array.from(input.files).forEach(f => _readAndInsert(f));
    input.value = '';
  });
}

function _readAndInsert(file) {
  const reader  = new FileReader();
  const altHint = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  reader.onload = e => _insertImageAtCursor(e.target.result, altHint);
  reader.readAsDataURL(file);
}

/** Public: insert an image from an external source (e.g. binder drag) */
export function insertImageInEditor(src, alt = '') {
  _insertImageAtCursor(src, alt);
}

function _insertImageAtCursor(src, alt = '') {
  const editor = el('editor');
  if (!editor || editor.contentEditable !== 'true') return;
  editor.focus();

  const img     = document.createElement('img');
  img.src       = src;
  img.alt       = alt;
  img.className = 'editor-image';
  img.style.maxWidth = '100%';

  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    range.insertNode(img);
    const after = document.createRange();
    after.setStartAfter(img);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  } else {
    editor.appendChild(img);
  }

  saveCurrentContent();
}

function _handleDragOver(e) {
  const hasImage = Array.from(e.dataTransfer?.items || []).some(i => i.type.startsWith('image/'));
  const hasBinderImg = Array.from(e.dataTransfer?.types || []).includes('application/x-zeropro-image');
  if (hasImage || hasBinderImg) e.preventDefault();
}

function _handleImageDrop(e) {
  // Check for binder image item dragged into editor
  const binderImg = e.dataTransfer?.getData('application/x-zeropro-image');
  if (binderImg) {
    e.preventDefault();
    const range = _caretRangeFromPoint(e.clientX, e.clientY);
    if (range) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const alt = e.dataTransfer?.getData('text/plain') || '';
    _insertImageAtCursor(binderImg, alt);
    return;
  }

  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();

  // Position cursor at drop point
  const range = _caretRangeFromPoint(e.clientX, e.clientY);
  if (range) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  files.forEach(f => _readAndInsert(f));
}

/** Cross-browser helper to get a caret range from x/y coordinates */
function _caretRangeFromPoint(x, y) {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y);
  }
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    return range;
  }
  return null;
}

// ─── Floating Image Toolbar ───────────────────────────────────────────────────

function _handleEditorClick(e) {
  if (e.target.tagName === 'IMG') {
    _selectedImg = e.target;
    _showImageToolbar(e.target);
  }
}

function _showImageToolbar(img) {
  let toolbar = el('img-toolbar');
  if (!toolbar) {
    toolbar = _createImageToolbar();
    document.body.appendChild(toolbar);
  }

  // Reflect current alignment in the toolbar buttons
  const currentAlign = _getImageAlign(img);
  toolbar.querySelectorAll('[data-align]').forEach(b => {
    b.classList.toggle('active', b.dataset.align === currentAlign);
  });

  // Reflect current size preset
  const currentSize = _getImageSize(img);
  toolbar.querySelectorAll('[data-size]').forEach(b => {
    b.classList.toggle('active', b.dataset.size === currentSize);
  });

  // Position the toolbar directly above the image (fixed positioning)
  const rect = img.getBoundingClientRect();
  toolbar.style.left = `${Math.max(4, rect.left)}px`;
  toolbar.style.top  = `${Math.max(4, rect.top - 42)}px`;
  toolbar.classList.remove('hidden');
}

function _hideImageToolbar() {
  el('img-toolbar')?.classList.add('hidden');
  _selectedImg = null;
}

function _createImageToolbar() {
  const t = document.createElement('div');
  t.id        = 'img-toolbar';
  t.className = 'img-toolbar hidden';
  t.setAttribute('role', 'toolbar');
  t.setAttribute('aria-label', 'Image options');
  t.innerHTML = `
    <button class="img-tb-btn" data-align="left"   title="Float left"  aria-label="Float left">
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
    </button>
    <button class="img-tb-btn" data-align="center" title="Center"      aria-label="Center">
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
    </button>
    <button class="img-tb-btn" data-align="right"  title="Float right" aria-label="Float right">
      <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M6 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/></svg>
    </button>
    <div class="img-tb-sep"></div>
    <button class="img-tb-btn img-size-btn" data-size="25"  title="25% width"  aria-label="25% width">S</button>
    <button class="img-tb-btn img-size-btn" data-size="50"  title="50% width"  aria-label="50% width">M</button>
    <button class="img-tb-btn img-size-btn" data-size="75"  title="75% width"  aria-label="75% width">L</button>
    <button class="img-tb-btn img-size-btn" data-size="100" title="Full width"  aria-label="Full width">F</button>
    <div class="img-tb-sep"></div>
    <button class="img-tb-btn" id="btn-img-alt"    title="Set alt text"   aria-label="Set alt text">ALT</button>
    <button class="img-tb-btn danger" id="btn-img-remove" title="Remove image" aria-label="Remove image">✕</button>
  `;

  t.addEventListener('mousedown', e => e.preventDefault()); // don't steal editor focus

  t.querySelectorAll('[data-align]').forEach(btn => {
    btn.addEventListener('click', () => { if (_selectedImg) _applyImageAlign(_selectedImg, btn.dataset.align); });
  });

  t.querySelectorAll('[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!_selectedImg) return;
      const pct = btn.dataset.size;
      _selectedImg.style.maxWidth = pct === '100' ? '100%' : `${pct}%`;
      _selectedImg.style.width = '';
      t.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === pct));
      saveCurrentContent();
    });
  });

  t.querySelector('#btn-img-alt')?.addEventListener('click', () => {
    if (!_selectedImg) return;
    showPrompt('Alt Text', 'Describe the image for screen readers…', _selectedImg.alt || '', alt => {
      if (_selectedImg) { _selectedImg.alt = alt; saveCurrentContent(); }
    });
  });

  t.querySelector('#btn-img-remove')?.addEventListener('click', () => {
    _selectedImg?.remove();
    _hideImageToolbar();
    saveCurrentContent();
  });

  return t;
}

/** Determine current size preset from maxWidth */
function _getImageSize(img) {
  const mw = img.style.maxWidth;
  if (mw === '25%') return '25';
  if (mw === '50%') return '50';
  if (mw === '75%') return '75';
  return '100';
}

/** Determine current alignment of an img element from its inline styles */
function _getImageAlign(img) {
  if (img.style.float === 'left')        return 'left';
  if (img.style.float === 'right')       return 'right';
  if (img.style.marginLeft === 'auto')   return 'center';
  return '';
}

function _applyImageAlign(img, align) {
  img.style.float        = '';
  img.style.display      = '';
  img.style.marginLeft   = '';
  img.style.marginRight  = '';
  img.style.marginBottom = '';

  switch (align) {
    case 'left':
      img.style.float        = 'left';
      img.style.marginRight  = '1em';
      img.style.marginBottom = '0.5em';
      break;
    case 'center':
      img.style.display      = 'block';
      img.style.marginLeft   = 'auto';
      img.style.marginRight  = 'auto';
      img.style.marginBottom = '0.5em';
      break;
    case 'right':
      img.style.float        = 'right';
      img.style.marginLeft   = '1em';
      img.style.marginBottom = '0.5em';
      break;
  }

  // Update button states without repositioning the toolbar
  el('img-toolbar')?.querySelectorAll('[data-align]').forEach(b => {
    b.classList.toggle('active', b.dataset.align === align);
  });

  saveCurrentContent();
}

// ─── Document Size Warning ────────────────────────────────────────────────────

function _checkDocumentSize(len) {
  if (_sizeWarned || len <= 5_000_000) return;
  _sizeWarned = true;
  showToast('Document is large (>5 MB) — autosave may slow down due to embedded images.', 5000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _moveCursorToStart(editor) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStart(editor, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  editor.focus();
}
