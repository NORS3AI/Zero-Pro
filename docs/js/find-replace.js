// find-replace.js — In-document find & replace (Ctrl+F / Ctrl+H)
// Phase 7: Power Features

// ─── State ────────────────────────────────────────────────────────────────────

let _getEditor = null;
let _marks     = [];    // <mark class="fr-highlight"> elements
let _markIdx   = -1;    // index of the currently-focused mark
let _panel     = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise find-replace. Call once at app init.
 * @param {{ getEditor: () => HTMLElement }} opts
 */
export function initFindReplace({ getEditor }) {
  _getEditor = getEditor;
  _panel = _buildPanel();

  // Insert panel at the top of #editor-pane (above the formatting toolbar)
  const pane = document.getElementById('editor-pane');
  if (pane) pane.insertBefore(_panel, pane.firstChild);

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'f') {
      // Only activate when editor pane is visible
      if (document.getElementById('editor-pane')?.classList.contains('active')) {
        e.preventDefault();
        openFindReplace(false);
      }
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'h') {
      if (document.getElementById('editor-pane')?.classList.contains('active')) {
        e.preventDefault();
        openFindReplace(true);
      }
    }
    if (e.key === 'Escape' && _panel && !_panel.classList.contains('hidden')) {
      closeFindReplace();
    }
  });
}

/** Open the panel. Pass showReplace=true to also expand the replace row. */
export function openFindReplace(showReplace = false) {
  if (!_panel) return;
  _panel.classList.remove('hidden');

  const replaceRow = _panel.querySelector('.fr-replace-row');
  const toggleBtn  = _panel.querySelector('#fr-toggle-replace');
  if (replaceRow) replaceRow.classList.toggle('hidden', !showReplace);
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', String(showReplace));
    toggleBtn.textContent = showReplace ? '▾' : '▸';
  }

  const findInput = _panel.querySelector('#fr-find');
  findInput?.focus();
  findInput?.select();
  _runSearch();
}

/** Close the panel and remove all highlights. */
export function closeFindReplace() {
  _clearMarks();
  _panel?.classList.add('hidden');
  _getEditor?.()?.focus();
}

// ─── Panel Construction ───────────────────────────────────────────────────────

function _buildPanel() {
  const panel = document.createElement('div');
  panel.id        = 'fr-panel';
  panel.className = 'fr-panel hidden';
  panel.setAttribute('role', 'search');
  panel.setAttribute('aria-label', 'Find and replace');

  panel.innerHTML = `
    <div class="fr-row">
      <button id="fr-toggle-replace" class="fr-toggle-btn" title="Toggle replace" aria-expanded="false">▸</button>
      <input  id="fr-find"  class="fr-input" type="text" placeholder="Find…" aria-label="Find" autocomplete="off" spellcheck="false">
      <span   id="fr-count" class="fr-count" aria-live="polite"></span>
      <button id="fr-prev"  class="fr-nav-btn" title="Previous match (Shift+Enter)" aria-label="Previous match">↑</button>
      <button id="fr-next"  class="fr-nav-btn" title="Next match (Enter)"           aria-label="Next match">↓</button>
      <button id="fr-close" class="fr-close-btn" title="Close (Escape)"             aria-label="Close find">✕</button>
    </div>
    <div class="fr-replace-row hidden">
      <input  id="fr-replace"     class="fr-input" type="text" placeholder="Replace with…" aria-label="Replace with" autocomplete="off" spellcheck="false">
      <button id="fr-replace-one" class="fr-action-btn">Replace</button>
      <button id="fr-replace-all" class="fr-action-btn">All</button>
    </div>
  `;

  // Toggle replace row visibility
  panel.querySelector('#fr-toggle-replace').addEventListener('click', () => {
    const row     = panel.querySelector('.fr-replace-row');
    const btn     = panel.querySelector('#fr-toggle-replace');
    const visible = !row.classList.contains('hidden');
    row.classList.toggle('hidden', visible);
    btn.setAttribute('aria-expanded', String(!visible));
    btn.textContent = visible ? '▸' : '▾';
    if (!visible) panel.querySelector('#fr-replace')?.focus();
  });

  // Live search on input
  panel.querySelector('#fr-find').addEventListener('input', _runSearch);

  // Keyboard nav inside find input
  panel.querySelector('#fr-find').addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); e.shiftKey ? _prev() : _next(); }
    if (e.key === 'Escape') { e.preventDefault(); closeFindReplace(); }
  });

  // Keyboard nav inside replace input
  panel.querySelector('#fr-replace').addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); _replaceOne(); }
    if (e.key === 'Escape') { e.preventDefault(); closeFindReplace(); }
  });

  panel.querySelector('#fr-prev').addEventListener('click',        _prev);
  panel.querySelector('#fr-next').addEventListener('click',        _next);
  panel.querySelector('#fr-close').addEventListener('click',       closeFindReplace);
  panel.querySelector('#fr-replace-one').addEventListener('click', _replaceOne);
  panel.querySelector('#fr-replace-all').addEventListener('click', _replaceAll);

  return panel;
}

// ─── Search Logic ─────────────────────────────────────────────────────────────

function _runSearch() {
  const query = _panel?.querySelector('#fr-find')?.value ?? '';
  _clearMarks();
  if (!query.trim()) { _updateCount(); return; }

  const editor = _getEditor?.();
  if (!editor) return;

  const regex = new RegExp(_escRegex(query), 'gi');

  // Collect text nodes — skip nodes already inside <mark> to avoid double-wrapping
  const walker = document.createTreeWalker(
    editor,
    NodeFilter.SHOW_TEXT,
    { acceptNode: n => n.parentElement?.tagName === 'MARK' ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT }
  );
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  // Wrap matches in <mark class="fr-highlight">
  textNodes.forEach(tn => {
    const text    = tn.nodeValue;
    const matches = [...text.matchAll(regex)];
    if (!matches.length) return;

    const frag    = document.createDocumentFragment();
    let   lastIdx = 0;

    matches.forEach(m => {
      if (m.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
      }
      const mark = document.createElement('mark');
      mark.className   = 'fr-highlight';
      mark.textContent = m[0];
      frag.appendChild(mark);
      _marks.push(mark);
      lastIdx = m.index + m[0].length;
    });

    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    tn.replaceWith(frag);
  });

  if (_marks.length) { _markIdx = 0; _scrollToMark(0); }
  _updateCount();
}

function _clearMarks() {
  _marks.forEach(mark => {
    if (mark.parentNode) {
      mark.replaceWith(document.createTextNode(mark.textContent));
    }
  });
  _getEditor?.()?.normalize();
  _marks   = [];
  _markIdx = -1;
}

function _next() {
  if (!_marks.length) return;
  _markIdx = (_markIdx + 1) % _marks.length;
  _scrollToMark(_markIdx);
  _updateCount();
}

function _prev() {
  if (!_marks.length) return;
  _markIdx = (_markIdx - 1 + _marks.length) % _marks.length;
  _scrollToMark(_markIdx);
  _updateCount();
}

function _scrollToMark(idx) {
  _marks.forEach((m, i) => m.classList.toggle('fr-current', i === idx));
  _marks[idx]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function _updateCount() {
  const countEl = _panel?.querySelector('#fr-count');
  if (!countEl) return;
  if (!_marks.length) {
    const query = _panel?.querySelector('#fr-find')?.value ?? '';
    countEl.textContent = query.trim() ? 'No results' : '';
    return;
  }
  countEl.textContent = `${_markIdx + 1} / ${_marks.length}`;
}

function _replaceOne() {
  if (_markIdx < 0 || _markIdx >= _marks.length) return;
  const mark        = _marks[_markIdx];
  const replacement = _panel?.querySelector('#fr-replace')?.value ?? '';
  mark.replaceWith(document.createTextNode(replacement));
  _marks.splice(_markIdx, 1);

  if (_marks.length) {
    _markIdx = Math.min(_markIdx, _marks.length - 1);
    _scrollToMark(_markIdx);
  } else {
    _markIdx = -1;
  }
  _updateCount();
  // Trigger autosave
  _getEditor?.()?.dispatchEvent(new Event('input', { bubbles: true }));
}

function _replaceAll() {
  const replacement = _panel?.querySelector('#fr-replace')?.value ?? '';
  const replaced    = _marks.length;
  _marks.forEach(mark => mark.replaceWith(document.createTextNode(replacement)));
  _marks   = [];
  _markIdx = -1;
  _getEditor?.()?.normalize();
  _getEditor?.()?.dispatchEvent(new Event('input', { bubbles: true }));

  const countEl = _panel?.querySelector('#fr-count');
  if (countEl) countEl.textContent = replaced > 0 ? `Replaced ${replaced}` : 'No results';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _escRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
