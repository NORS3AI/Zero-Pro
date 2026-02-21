// wiki-links.js — [[DocName]] cross-document linking in the editor (Phase 12)
// Typing [[ in the contenteditable editor opens an autocomplete dropdown listing
// all documents. Selecting one inserts a clickable wiki-link anchor.
// Clicking a rendered wiki link navigates to that document.

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject  = null;
let _onNavigate  = null; // (docId) => void
let _dropdown    = null;
let _editorEl    = null;
let _bracketRange = null;  // Range covering the [[ ... typed so far

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise wiki-link support.
 * @param {{ getProject: Function, onNavigate: Function }} opts
 *   onNavigate(docId) is called when a link is clicked
 */
export function initWikiLinks({ getProject, onNavigate }) {
  _getProject = getProject;
  _onNavigate = onNavigate;
  _dropdown   = _buildDropdown();
  document.body.appendChild(_dropdown);

  // Wire editor events once the DOM is ready
  requestAnimationFrame(_attachEditor);
}

/** Re-render wiki links in the editor (call after loading a new document). */
export function activateWikiLinks(editorEl) {
  if (!editorEl) return;
  _editorEl = editorEl;
  _processWikiLinks(editorEl);
}

// ─── Editor Attachment ────────────────────────────────────────────────────────

function _attachEditor() {
  const editor = document.getElementById('editor');
  if (!editor) { setTimeout(_attachEditor, 200); return; }
  _editorEl = editor;

  editor.addEventListener('input', _onInput);
  editor.addEventListener('keydown', _onKeyDown);
  editor.addEventListener('click', _onEditorClick);

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!_dropdown.contains(e.target) && e.target !== editor) _closeDropdown();
  });
}

// ─── Input Detection ──────────────────────────────────────────────────────────

function _onInput() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) { _closeDropdown(); return; }

  const range  = sel.getRangeAt(0);
  const node   = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) { _closeDropdown(); return; }

  const text    = node.textContent || '';
  const offset  = range.startOffset;
  const before  = text.slice(0, offset);

  // Look for [[ followed by optional search text (no ] yet)
  const match = before.match(/\[\[([^\][\n]*)$/);
  if (!match) { _closeDropdown(); return; }

  const query = match[1].toLowerCase();
  const docs  = _getDocs(query);

  if (!docs.length) { _closeDropdown(); return; }

  // Save the range covering [[query so we can replace it on selection
  const bracketStart = offset - match[0].length;
  _bracketRange = document.createRange();
  _bracketRange.setStart(node, bracketStart);
  _bracketRange.setEnd(node, offset);

  _openDropdown(docs, range);
}

function _onKeyDown(e) {
  if (!_dropdown.classList.contains('open')) return;

  const items = [..._dropdown.querySelectorAll('.wiki-ac-item')];
  const cur   = _dropdown.querySelector('.wiki-ac-item.selected');
  const idx   = items.indexOf(cur);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    items[Math.min(idx + 1, items.length - 1)]?.classList.add('selected');
    cur?.classList.remove('selected');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    items[Math.max(idx - 1, 0)]?.classList.add('selected');
    cur?.classList.remove('selected');
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    const sel = _dropdown.querySelector('.wiki-ac-item.selected');
    if (sel) { e.preventDefault(); _insertLink(sel.dataset.id, sel.dataset.title); }
    else { _closeDropdown(); }
  } else if (e.key === 'Escape') {
    _closeDropdown();
  }
}

function _onEditorClick(e) {
  const link = e.target.closest('a.wiki-link');
  if (!link) return;
  e.preventDefault();
  const docId = link.dataset.docId;
  if (docId) _onNavigate?.(docId);
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function _buildDropdown() {
  const el = document.createElement('div');
  el.className = 'wiki-autocomplete';
  el.setAttribute('role', 'listbox');
  el.setAttribute('aria-label', 'Link to document');
  return el;
}

function _openDropdown(docs, caretRange) {
  _dropdown.innerHTML = '';

  if (!docs.length) {
    _dropdown.innerHTML = '<div class="wiki-ac-empty">No documents match</div>';
  } else {
    docs.forEach((doc, i) => {
      const item = document.createElement('div');
      item.className = `wiki-ac-item${i === 0 ? ' selected' : ''}`;
      item.setAttribute('role', 'option');
      item.dataset.id    = doc.id;
      item.dataset.title = doc.title;
      item.textContent   = doc.title;
      item.addEventListener('mousedown', e => {
        e.preventDefault(); // prevent blur
        _insertLink(doc.id, doc.title);
      });
      _dropdown.appendChild(item);
    });
  }

  // Position near the caret
  const rect = caretRange.getBoundingClientRect();
  _dropdown.style.top  = `${rect.bottom + 4 + window.scrollY}px`;
  _dropdown.style.left = `${rect.left}px`;
  _dropdown.classList.add('open');
}

function _closeDropdown() {
  _dropdown.classList.remove('open');
  _bracketRange = null;
}

// ─── Link Insertion ───────────────────────────────────────────────────────────

function _insertLink(docId, title) {
  if (!_bracketRange) { _closeDropdown(); return; }

  // Delete the [[ + typed text
  _bracketRange.deleteContents();

  // Insert the wiki-link anchor
  const anchor = document.createElement('a');
  anchor.className     = 'wiki-link';
  anchor.dataset.docId = docId;
  anchor.href          = '#';
  anchor.textContent   = `[[${title}]]`;
  anchor.contentEditable = 'false';

  _bracketRange.insertNode(anchor);

  // Move caret after the anchor
  const sel = window.getSelection();
  const r   = document.createRange();
  r.setStartAfter(anchor);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);

  _closeDropdown();

  // Trigger save
  _editorEl?.dispatchEvent(new Event('input', { bubbles: true }));
}

// ─── Post-Load Processing ─────────────────────────────────────────────────────

/** Make all wiki-link anchors in the editor clickable. */
function _processWikiLinks(editorEl) {
  editorEl.querySelectorAll('a.wiki-link').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      const docId = a.dataset.docId;
      if (docId) _onNavigate?.(docId);
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _getDocs(query) {
  const project = _getProject?.();
  if (!project) return [];
  return (project.documents || [])
    .filter(d => d.type === 'doc' && !d.inTrash && (!query || d.title.toLowerCase().includes(query)))
    .slice(0, 10);
}
