// prompt-library.js — Custom AI prompt templates (Phase 11)
// Writers save frequently-used prompts by name and load them into the AI panel.

import { showToast } from './ui.js';

const STORAGE_KEY = 'zp_prompt_library';

// ─── State ────────────────────────────────────────────────────────────────────

let _modal    = null;
let _onSelect = null;   // called with the chosen prompt text

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Open the prompt library picker.
 * @param {Function} onSelect  Called with (promptText: string) when a template is chosen
 * @param {string}   [currentText]  Current prompt text to offer as "Save" default
 */
export function openPromptLibrary(onSelect, currentText = '') {
  _onSelect = onSelect;

  if (!_modal) {
    _modal = _buildModal();
    document.body.appendChild(_modal);
  }

  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _modal.querySelector('#pl-save-input').value = '';
  _modal._currentText = currentText;
  _render();
}

/**
 * Save a prompt template directly (without opening the modal).
 * @param {string} name  Template name
 * @param {string} text  Prompt text
 */
export function savePromptTemplate(name, text) {
  if (!name?.trim() || !text?.trim()) return;
  const lib = _load();
  lib.push({ id: _id(), name: name.trim(), text: text.trim(), createdAt: Date.now() });
  _save(lib);
}

// ─── Modal Construction ───────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'pl-overlay';
  overlay.className = 'pl-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Prompt Library');

  overlay.innerHTML = `
    <div class="pl-modal">
      <div class="pl-header">
        <h3>Prompt Library</h3>
        <button class="pl-close" aria-label="Close">&times;</button>
      </div>
      <div class="pl-body" id="pl-body"></div>
      <div class="pl-save-row">
        <input type="text" class="pl-save-input" id="pl-save-input"
               placeholder="Template name…" aria-label="New template name">
        <button class="btn" id="pl-save-btn">Save Current Prompt</button>
      </div>
    </div>`;

  overlay.querySelector('.pl-close').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  overlay.querySelector('#pl-save-btn').addEventListener('click', () => {
    const name = overlay.querySelector('#pl-save-input').value.trim();
    const text = overlay._currentText ?? '';
    if (!name)  { showToast('Enter a template name'); return; }
    if (!text)  { showToast('No prompt text to save'); return; }
    savePromptTemplate(name, text);
    overlay.querySelector('#pl-save-input').value = '';
    showToast(`Saved "${name}"`);
    _render();
  });

  return overlay;
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

// ─── List Rendering ───────────────────────────────────────────────────────────

function _render() {
  const body = document.getElementById('pl-body');
  if (!body) return;

  const lib = _load();

  if (!lib.length) {
    body.innerHTML = `<p class="pl-empty">
      No saved templates yet.<br>
      Type a prompt in the AI panel, name it below, and click "Save Current Prompt".
    </p>`;
    return;
  }

  body.innerHTML = '';
  lib.slice().sort((a, b) => b.createdAt - a.createdAt).forEach(tmpl => {
    const item = document.createElement('div');
    item.className = 'pl-item';
    item.setAttribute('role', 'listitem');

    item.innerHTML = `
      <div class="pl-item-name">${_esc(tmpl.name)}</div>
      <div class="pl-item-preview">${_esc(tmpl.text)}</div>
      <button class="btn btn-sm pl-item-use" data-id="${tmpl.id}">Use</button>
      <button class="pl-item-del" data-id="${tmpl.id}" title="Delete template" aria-label="Delete ${_esc(tmpl.name)}">&times;</button>`;

    item.querySelector('.pl-item-use').addEventListener('click', e => {
      e.stopPropagation();
      _onSelect?.(tmpl.text);
      _close();
    });

    item.querySelector('.pl-item-del').addEventListener('click', e => {
      e.stopPropagation();
      const lib2 = _load().filter(t => t.id !== tmpl.id);
      _save(lib2);
      showToast(`Deleted "${tmpl.name}"`);
      _render();
    });

    // Clicking the row itself also selects
    item.addEventListener('click', () => {
      _onSelect?.(tmpl.text);
      _close();
    });

    body.appendChild(item);
  });
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function _load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function _save(lib) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lib)); }
  catch { /* ignore */ }
}

function _id() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
