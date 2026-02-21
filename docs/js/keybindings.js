// keybindings.js — Keyboard shortcut reference panel + customisable bindings (Phase 11)
// Built-in shortcuts are listed in SHORTCUTS. Users may remap any shortcut
// by clicking Edit next to it; the new binding is stored in localStorage.
// app.js reads the custom map and calls registerKeybindings() to activate it.

const STORAGE_KEY = 'zp_keybindings';

// ─── Default Shortcuts ────────────────────────────────────────────────────────

/** @type {Array<{ id:string, action:string, group:string, keys:string[], rebindable:boolean }>} */
export const SHORTCUTS = [
  // Formatting
  { id: 'bold',       action: 'Bold',           group: 'Formatting', keys: ['Ctrl', 'B'],        rebindable: false },
  { id: 'italic',     action: 'Italic',         group: 'Formatting', keys: ['Ctrl', 'I'],        rebindable: false },
  { id: 'underline',  action: 'Underline',      group: 'Formatting', keys: ['Ctrl', 'U'],        rebindable: false },
  { id: 'strike',     action: 'Strikethrough',  group: 'Formatting', keys: ['Ctrl', 'Shift', 'X'], rebindable: false },

  // Editor
  { id: 'save',       action: 'Force Save',     group: 'Editor',     keys: ['Ctrl', 'S'],        rebindable: false },
  { id: 'focus',      action: 'Toggle Focus Mode', group: 'Editor',  keys: ['Ctrl', 'F2'],       rebindable: true  },
  { id: 'md-mode',    action: 'Toggle Markdown Mode', group: 'Editor', keys: ['Ctrl', 'M'],      rebindable: true  },
  { id: 'snapshot',   action: 'Take Snapshot',  group: 'Editor',     keys: ['Ctrl', 'Shift', 'S'], rebindable: true },

  // Find
  { id: 'find',       action: 'Find',           group: 'Find',       keys: ['Ctrl', 'F'],        rebindable: false },
  { id: 'replace',    action: 'Find & Replace', group: 'Find',       keys: ['Ctrl', 'H'],        rebindable: false },
  { id: 'proj-search', action: 'Project Search', group: 'Find',      keys: ['Ctrl', 'Shift', 'F'], rebindable: false },

  // Views
  { id: 'view-editor',    action: 'Editor View',    group: 'Views', keys: ['Ctrl', '1'], rebindable: true },
  { id: 'view-corkboard', action: 'Corkboard View', group: 'Views', keys: ['Ctrl', '2'], rebindable: true },
  { id: 'view-outline',   action: 'Outline View',   group: 'Views', keys: ['Ctrl', '3'], rebindable: true },
  { id: 'view-timeline',  action: 'Timeline View',  group: 'Views', keys: ['Ctrl', '4'], rebindable: true },

  // App
  { id: 'settings',   action: 'Open Settings',  group: 'App',        keys: ['Ctrl', ','],        rebindable: false },
  { id: 'palette',    action: 'Command Palette', group: 'App',        keys: ['Ctrl', 'K'],        rebindable: false },
  { id: 'shortcuts',  action: 'Keyboard Shortcuts', group: 'App',    keys: ['Ctrl', '?'],        rebindable: false },
  { id: 'compile',    action: 'Compile Wizard',  group: 'App',        keys: ['Ctrl', 'Shift', 'C'], rebindable: true },
  { id: 'ai-panel',   action: 'Toggle AI Panel', group: 'App',        keys: ['Ctrl', 'Shift', 'A'], rebindable: true },
  { id: 'stats',      action: 'Writing Statistics', group: 'App',     keys: ['Ctrl', 'Shift', 'D'], rebindable: true },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _modal        = null;
let _customMap    = {};   // id → keys[] override
let _listenTarget = null; // shortcut id currently waiting for a new key press
let _actionMap    = {};   // id → handler function (set by registerKeybindings)

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load saved custom bindings and register the global keydown handler.
 * @param {Object.<string, Function>} actions  Map of shortcut id → callback
 */
export function registerKeybindings(actions) {
  _customMap = _load();
  _actionMap = actions || {};

  document.addEventListener('keydown', _onKeyDown);
}

/** Open the keyboard shortcuts reference modal. */
export function openShortcutsPanel() {
  if (!_modal) {
    _modal = _buildModal();
    document.body.appendChild(_modal);
  }
  _customMap = _load();
  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _renderList('');
}

/** Returns the effective keys for a shortcut id (custom or default). */
export function getKeys(id) {
  return _customMap[id] || SHORTCUTS.find(s => s.id === id)?.keys || [];
}

// ─── Global Key Handler ───────────────────────────────────────────────────────

function _onKeyDown(e) {
  // Skip when focused in an input / textarea (except Escape + panel shortcuts)
  const tag = e.target?.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (inInput) return;

  const mods = [];
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
  if (e.shiftKey) mods.push('Shift');
  if (e.altKey)   mods.push('Alt');

  const key  = e.key === ',' ? ',' : e.key === '?' ? '?' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const combo = [...mods, key].join('+');

  for (const shortcut of SHORTCUTS) {
    const effective = getKeys(shortcut.id);
    const effectiveCombo = effective.join('+');
    if (combo === effectiveCombo && _actionMap[shortcut.id]) {
      e.preventDefault();
      _actionMap[shortcut.id]();
      return;
    }
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'kb-overlay';
  overlay.className = 'kb-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Keyboard Shortcuts');

  overlay.innerHTML = `
    <div class="kb-modal">
      <div class="kb-header">
        <h3>Keyboard Shortcuts</h3>
        <button class="kb-close" aria-label="Close">&times;</button>
      </div>
      <div class="kb-search-wrap">
        <input type="search" class="kb-search" id="kb-search" placeholder="Search shortcuts…" aria-label="Search shortcuts">
      </div>
      <div class="kb-body" id="kb-body"></div>
      <div class="kb-footer">
        <button class="kb-reset-btn" id="kb-reset-btn">Reset all to defaults</button>
      </div>
    </div>`;

  overlay.querySelector('.kb-close').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });

  overlay.querySelector('#kb-search').addEventListener('input', e => {
    _renderList(e.target.value.trim().toLowerCase());
  });

  overlay.querySelector('#kb-reset-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    _customMap = {};
    _renderList('');
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  return overlay;
}

function _close() {
  _listenTarget = null;
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function _renderList(query) {
  const body = document.getElementById('kb-body');
  if (!body) return;

  // Group shortcuts by category
  const groups = {};
  SHORTCUTS.forEach(s => {
    const show = !query || s.action.toLowerCase().includes(query) || s.group.toLowerCase().includes(query);
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push({ ...s, hidden: !show });
  });

  body.innerHTML = '';

  Object.entries(groups).forEach(([group, items]) => {
    const allHidden = items.every(i => i.hidden);
    if (allHidden) return;

    const groupEl = document.createElement('div');
    groupEl.className = 'kb-group';
    groupEl.innerHTML = `<div class="kb-group-title">${_esc(group)}</div>`;

    items.forEach(shortcut => {
      const effective = getKeys(shortcut.id);
      const row = document.createElement('div');
      row.className = `kb-row${shortcut.hidden ? ' hidden-row' : ''}`;
      row.dataset.id = shortcut.id;

      row.innerHTML = `
        <span class="kb-action">${_esc(shortcut.action)}</span>
        <span class="kb-keys">${effective.map(k => `<kbd>${_esc(k)}</kbd>`).join(' ')}</span>
        ${shortcut.rebindable
          ? `<button class="kb-edit-btn" data-id="${shortcut.id}" title="Click then press new shortcut">Edit</button>`
          : ''}`;

      if (shortcut.rebindable) {
        const editBtn = row.querySelector('.kb-edit-btn');
        editBtn.addEventListener('click', () => _startListening(shortcut.id, row));
      }

      groupEl.appendChild(row);
    });

    body.appendChild(groupEl);
  });
}

function _startListening(id, row) {
  _listenTarget = id;
  const btn = row.querySelector('.kb-edit-btn');
  if (btn) { btn.textContent = 'Press keys…'; btn.classList.add('listening'); }

  const onKey = e => {
    if (_listenTarget !== id) { cleanup(); return; }
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') { cleanup(); return; }

    const mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
    if (e.shiftKey) mods.push('Shift');
    if (e.altKey)   mods.push('Alt');
    const key   = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const combo = [...mods, key];

    _customMap[id] = combo;
    _save(_customMap);
    cleanup();
    _renderList(document.getElementById('kb-search')?.value.trim().toLowerCase() || '');
  };

  const cleanup = () => {
    _listenTarget = null;
    document.removeEventListener('keydown', onKey, true);
    if (btn) { btn.textContent = 'Edit'; btn.classList.remove('listening'); }
  };

  document.addEventListener('keydown', onKey, true);
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function _load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function _save(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }
  catch { /* ignore */ }
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
