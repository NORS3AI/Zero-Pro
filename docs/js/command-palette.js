// command-palette.js — Ctrl+K fuzzy document & action launcher
// Phase 7: Power Features

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject  = null;
let _onSelectDoc = null;
let _getActions  = null;
let _overlay     = null;
let _list        = null;
let _items       = [];    // rendered result items
let _activeIdx   = -1;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the command palette. Call once at app init.
 * @param {{ getProject: Function, onSelectDoc: Function, getActions: Function }} opts
 */
export function initCommandPalette({ getProject, onSelectDoc, getActions }) {
  _getProject  = getProject;
  _onSelectDoc = onSelectDoc;
  _getActions  = getActions;

  _overlay = _buildOverlay();
  document.body.appendChild(_overlay);

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openPalette();
    }
  });
}

/** Open the command palette with focus in the search input. */
export function openPalette() {
  if (!_overlay) return;
  _overlay.classList.remove('hidden');
  const input = _overlay.querySelector('#cmd-input');
  if (input) { input.value = ''; input.focus(); }
  _render('');
}

// ─── Build ────────────────────────────────────────────────────────────────────

function _buildOverlay() {
  const overlay = document.createElement('div');
  overlay.id        = 'cmd-overlay';
  overlay.className = 'cmd-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Command palette');

  overlay.innerHTML = `
    <div class="cmd-palette">
      <input id="cmd-input" class="cmd-input" type="text"
             placeholder="Search documents and commands…"
             autocomplete="off" spellcheck="false"
             aria-label="Search" role="combobox"
             aria-autocomplete="list" aria-expanded="true"
             aria-controls="cmd-list">
      <div id="cmd-list" class="cmd-list" role="listbox" aria-label="Results"></div>
    </div>
  `;

  _list = overlay.querySelector('#cmd-list');

  // Live filter
  overlay.querySelector('#cmd-input').addEventListener('input', e => _render(e.target.value));

  // Keyboard navigation
  overlay.querySelector('#cmd-input').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown')  { e.preventDefault(); _move(1); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); _move(-1); }
    if (e.key === 'Enter')      { e.preventDefault(); _activateSelected(); }
    if (e.key === 'Escape')     { e.preventDefault(); _close(); }
  });

  // Click backdrop to close
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });

  return overlay;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function _render(query) {
  _list.innerHTML = '';
  _items      = [];
  _activeIdx  = -1;

  const results = _buildResults(query.trim());

  if (!results.length) {
    const empty = document.createElement('div');
    empty.className   = 'cmd-empty';
    empty.textContent = query.trim() ? 'No results' : 'Type to search documents and commands…';
    _list.appendChild(empty);
    return;
  }

  let lastType = null;
  results.forEach((item, idx) => {
    // Section separator
    if (item.type !== lastType) {
      lastType = item.type;
      const sep = document.createElement('div');
      sep.className   = 'cmd-section';
      sep.textContent = item.type;
      _list.appendChild(sep);
    }

    const el = document.createElement('div');
    el.className = 'cmd-item';
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', 'false');
    el.dataset.idx = idx;

    const iconEl = document.createElement('span');
    iconEl.className   = 'cmd-item-icon';
    iconEl.textContent = item.icon;

    const textWrap = document.createElement('span');
    textWrap.className = 'cmd-item-text';

    const labelEl = document.createElement('span');
    labelEl.className   = 'cmd-item-label';
    labelEl.textContent = item.label;
    textWrap.appendChild(labelEl);

    if (item.hint) {
      const hintEl = document.createElement('span');
      hintEl.className   = 'cmd-item-hint';
      hintEl.textContent = item.hint;
      textWrap.appendChild(hintEl);
    }

    el.appendChild(iconEl);
    el.appendChild(textWrap);
    el.addEventListener('click', () => { _run(item); _close(); });
    el.addEventListener('mousemove', () => _setActive(idx));

    _list.appendChild(el);
    _items.push({ el, item });
  });

  if (_items.length) { _activeIdx = 0; _setActive(0); }
}

function _buildResults(query) {
  const results = [];
  const project = _getProject?.();

  if (project) {
    // Documents
    const docs = project.documents
      .filter(d => !d.inTrash && d.type === 'doc')
      .filter(d => !query || _fuzzy(query, d.title))
      .slice(0, 8);

    docs.forEach(d => results.push({
      type:  'Documents',
      icon:  '📄',
      label: d.title,
      hint:  d.wordCount ? `${d.wordCount.toLocaleString()} words` : '',
      run:   () => _onSelectDoc?.(d.id),
    }));

    // Folders
    const folders = project.documents
      .filter(d => !d.inTrash && d.type === 'folder')
      .filter(d => !query || _fuzzy(query, d.title))
      .slice(0, 4);

    folders.forEach(d => results.push({
      type:  'Folders',
      icon:  '📁',
      label: d.title,
      hint:  'Folder',
      run:   () => _onSelectDoc?.(d.id),
    }));
  }

  // Actions
  const actions = _getActions?.() ?? [];
  actions
    .filter(a => !query || _fuzzy(query, a.label))
    .forEach(a => results.push({
      type:  'Commands',
      icon:  a.icon || '⚡',
      label: a.label,
      hint:  a.hint || '',
      run:   a.run,
    }));

  return results;
}

function _move(dir) {
  if (!_items.length) return;
  const next = Math.max(0, Math.min(_items.length - 1, _activeIdx + dir));
  _setActive(next);
}

function _setActive(idx) {
  _items.forEach(({ el }, i) => {
    el.classList.toggle('active', i === idx);
    el.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  _activeIdx = idx;
  _items[idx]?.el.scrollIntoView({ block: 'nearest' });
}

function _activateSelected() {
  if (_activeIdx < 0 || _activeIdx >= _items.length) return;
  _run(_items[_activeIdx].item);
  _close();
}

function _run(item) {
  item.run?.();
}

function _close() {
  _overlay?.classList.add('hidden');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple fuzzy match: all chars of query appear in target in order. */
function _fuzzy(query, target) {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}
