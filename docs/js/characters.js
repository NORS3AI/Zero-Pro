// characters.js — Character database (Phase 12)
// Characters are stored in project.characters[].
// The UI is a two-pane modal: list on the left, editor on the right.

import { saveProject } from './storage.js';
import { showToast, showConfirm } from './ui.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _getProject      = null;
let _onProjectChange = null;
let _modal           = null;
let _selectedId      = null;

const ROLES = ['protagonist', 'antagonist', 'supporting', 'minor'];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the character module.
 * @param {{ getProject: Function, onProjectChange: Function }} opts
 */
export function initCharacters({ getProject, onProjectChange }) {
  _getProject      = getProject;
  _onProjectChange = onProjectChange;
}

/** Open the character database modal. */
export function openCharacterDatabase() {
  if (!_modal) {
    _modal = _buildModal();
    document.body.appendChild(_modal);
  }
  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _selectedId = null;
  _renderList('');
  _showEditPane(null);
}

/**
 * Return an array of character names for the current project (used by inspector POV autocomplete).
 * @returns {string[]}
 */
export function getCharacterNames() {
  return (_getProject?.()?.characters ?? []).map(c => c.name).filter(Boolean);
}

// ─── Modal Construction ───────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'char-overlay';
  overlay.className = 'p12-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Character Database');

  overlay.innerHTML = `
    <div class="char-modal">
      <div class="char-header">
        <h3>Character Database</h3>
        <div class="char-header-actions">
          <button class="btn" id="char-new-btn">+ New Character</button>
          <button class="char-close" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="char-body">
        <div class="char-list-col">
          <div class="char-search-wrap">
            <input type="search" class="char-search" id="char-search" placeholder="Search…" aria-label="Search characters">
          </div>
          <div class="char-list" id="char-list" role="listbox" aria-label="Characters"></div>
        </div>
        <div class="char-edit-col" id="char-edit-col">
          <div class="char-no-selection">Select a character or create one</div>
        </div>
      </div>
    </div>`;

  overlay.querySelector('.char-close').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  overlay.querySelector('#char-new-btn').addEventListener('click', () => {
    const char = _createCharacter();
    _getProject().characters.push(char);
    saveProject(_getProject());
    _selectedId = char.id;
    _renderList('');
    _showEditPane(char);
  });

  overlay.querySelector('#char-search').addEventListener('input', e => {
    _renderList(e.target.value.trim().toLowerCase());
  });

  return overlay;
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

// ─── List Rendering ───────────────────────────────────────────────────────────

function _renderList(query) {
  const list = document.getElementById('char-list');
  if (!list) return;

  const project = _getProject?.();
  const chars   = project?.characters ?? [];
  const filtered = query
    ? chars.filter(c => (c.name + c.role + c.description).toLowerCase().includes(query))
    : chars;

  list.innerHTML = '';

  if (!filtered.length) {
    list.innerHTML = `<div class="char-empty">${query ? 'No matches.' : 'No characters yet.<br>Click "+ New Character" to add one.'}</div>`;
    return;
  }

  filtered.forEach(char => {
    const item = document.createElement('div');
    item.className = `char-list-item${char.id === _selectedId ? ' active' : ''}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', char.id === _selectedId ? 'true' : 'false');
    item.dataset.id = char.id;

    const initials = (char.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    item.innerHTML = `
      <div class="char-avatar">${_esc(initials)}</div>
      <div>
        <div class="char-list-name">${_esc(char.name || 'Unnamed')}</div>
        <div class="char-list-role">${_esc(char.role || 'minor')}</div>
      </div>`;

    item.addEventListener('click', () => {
      _selectedId = char.id;
      list.querySelectorAll('.char-list-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === char.id);
        el.setAttribute('aria-selected', el.dataset.id === char.id ? 'true' : 'false');
      });
      _showEditPane(char);
    });

    list.appendChild(item);
  });
}

// ─── Edit Pane ────────────────────────────────────────────────────────────────

function _showEditPane(char) {
  const col = document.getElementById('char-edit-col');
  if (!col) return;

  if (!char) {
    col.innerHTML = '<div class="char-no-selection">Select a character or create one</div>';
    return;
  }

  col.innerHTML = `
    <div class="char-field-row">
      <div class="char-field" style="flex:2">
        <label class="char-label" for="char-name">Name</label>
        <input id="char-name" class="char-input" type="text" value="${_esc(char.name || '')}" placeholder="Full name…">
      </div>
      <div class="char-field" style="flex:1">
        <label class="char-label" for="char-role">Role</label>
        <select id="char-role" class="char-select">
          ${ROLES.map(r => `<option value="${r}"${char.role === r ? ' selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="char-field" style="flex:0 0 80px">
        <label class="char-label" for="char-age">Age</label>
        <input id="char-age" class="char-input" type="text" value="${_esc(char.age || '')}" placeholder="—">
      </div>
    </div>

    <div class="char-field">
      <label class="char-label" for="char-desc">Description / Personality</label>
      <textarea id="char-desc" class="char-textarea" placeholder="Who are they? What drives them?">${_esc(char.description || '')}</textarea>
    </div>

    <div class="char-field">
      <label class="char-label" for="char-appearance">Appearance</label>
      <textarea id="char-appearance" class="char-textarea" placeholder="Physical traits, voice, mannerisms…">${_esc(char.appearance || '')}</textarea>
    </div>

    <div class="char-field">
      <label class="char-label" for="char-arc">Character Arc</label>
      <textarea id="char-arc" class="char-textarea" placeholder="How do they change across the story?">${_esc(char.arcSummary || '')}</textarea>
    </div>

    <div class="char-field">
      <label class="char-label" for="char-notes">Notes / Relationships</label>
      <textarea id="char-notes" class="char-textarea" placeholder="Relationships, backstory, secrets…">${_esc(char.notes || '')}</textarea>
    </div>

    <button class="char-delete-btn" id="char-delete-btn">Delete character</button>`;

  // Auto-save on every change
  const fields = { name: 'name', role: 'role', age: 'age', desc: 'description', appearance: 'appearance', arc: 'arcSummary', notes: 'notes' };
  Object.entries(fields).forEach(([id, key]) => {
    col.querySelector(`#char-${id}`)?.addEventListener('input', e => {
      char[key] = e.target.value;
      saveProject(_getProject());
      if (id === 'name' || id === 'role') _renderList(document.getElementById('char-search')?.value.trim().toLowerCase() || '');
    });
  });

  col.querySelector('#char-delete-btn').addEventListener('click', () => {
    showConfirm(`Delete "${char.name || 'this character'}"?`, () => {
      const project = _getProject();
      project.characters = (project.characters || []).filter(c => c.id !== char.id);
      saveProject(project);
      _selectedId = null;
      _renderList('');
      _showEditPane(null);
      showToast('Character deleted');
    });
  });
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────

function _createCharacter() {
  return {
    id:          _uid(),
    name:        '',
    role:        'supporting',
    age:         '',
    description: '',
    appearance:  '',
    arcSummary:  '',
    notes:       '',
    createdAt:   Date.now(),
  };
}

/** Ensure project.characters exists */
export function ensureCharacters(project) {
  if (!Array.isArray(project.characters)) project.characters = [];
}

function _uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
