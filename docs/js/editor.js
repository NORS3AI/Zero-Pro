// editor.js — Rich text editor: formatting, autosave, word count, focus mode

import { updateDocument, saveProjectDebounced, countWords } from './storage.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _project = null;
let _currentDoc = null;
let _onDocChange = null;
let _focusMode = false;

// ─── DOM Shortcuts ────────────────────────────────────────────────────────────

const el = id => document.getElementById(id);

// ─── Public API ───────────────────────────────────────────────────────────────

/** Wire up all editor events */
export function initEditor({ onDocChange }) {
  _onDocChange = onDocChange;

  const editor = el('editor');
  if (!editor) return;

  editor.addEventListener('input', _handleInput);
  editor.addEventListener('keydown', _handleKeydown);
  editor.addEventListener('keyup', _updateFocusHighlight);
  editor.addEventListener('mouseup', _updateFocusHighlight);

  // Toolbar format buttons
  document.querySelectorAll('[data-format]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent editor losing focus
      _applyFormat(btn.dataset.format);
    });
  });

  // Track selection changes to update toolbar state
  document.addEventListener('selectionchange', _updateToolbar);
}

/** Load a document into the editor */
export function loadDocument(project, doc) {
  _project = project;
  _currentDoc = doc;

  const editor = el('editor');
  const placeholder = el('editor-placeholder');
  const toolbar = el('editor-toolbar');

  if (!editor) return;

  if (doc && doc.type === 'doc') {
    editor.innerHTML = doc.content || '<p></p>';
    editor.contentEditable = 'true';
    editor.setAttribute('aria-label', doc.title);
    editor.classList.remove('empty');
    placeholder?.classList.add('hidden');
    toolbar?.classList.remove('hidden');
    // Place cursor at start
    _moveCursorToStart(editor);
  } else {
    editor.innerHTML = '';
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

  const content = editor.innerHTML;
  const wordCount = countWords(editor.innerText || '');
  updateDocument(_project, _currentDoc.id, { content, wordCount });
  _currentDoc.content = content;
  _currentDoc.wordCount = wordCount;

  saveProjectDebounced(_project);
  _onDocChange?.(_project, _currentDoc);
  _updateWordCountDisplay();
}

/** Toggle focus/typewriter mode; returns the new state */
export function toggleFocusMode() {
  _focusMode = !_focusMode;
  el('editor-pane')?.classList.toggle('focus-mode', _focusMode);
  if (!_focusMode) {
    // Remove all dimming
    el('editor')?.querySelectorAll('.dimmed').forEach(n => n.classList.remove('dimmed'));
  } else {
    _updateFocusHighlight();
  }
  return _focusMode;
}

// ─── Internal Handlers ────────────────────────────────────────────────────────

function _handleInput() {
  saveCurrentContent();
}

function _handleKeydown(e) {
  // Bold
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'b') { e.preventDefault(); _applyFormat('bold'); }
  // Italic
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'i') { e.preventDefault(); _applyFormat('italic'); }
  // Underline
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'u') { e.preventDefault(); _applyFormat('underline'); }
  // Force <p> on Enter instead of <div>
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.execCommand('insertParagraph');
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
  const wcEl = el('word-count');
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
