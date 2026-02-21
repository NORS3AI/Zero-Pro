// webhooks.js — Automation & scripting (Phase 11)
// Outbound webhooks fired on project events; batch scene rename utility.

import { saveProject, getDocument } from './storage.js';
import { showToast, showPrompt } from './ui.js';

const STORAGE_KEY = 'zp_webhooks';

// ─── Webhook events ───────────────────────────────────────────────────────────

const EVENTS = [
  {
    id:    'on_save',
    label: 'On Project Save',
    desc:  'Fired every time the project is auto-saved (debounced, ~5s after writing stops).',
  },
  {
    id:    'on_target',
    label: 'On Word Target Reached',
    desc:  'Fired when a document reaches its word count target for the first time.',
  },
  {
    id:    'on_snapshot',
    label: 'On Snapshot Taken',
    desc:  'Fired when the writer takes a manual snapshot.',
  },
  {
    id:    'on_export',
    label: 'On Export',
    desc:  'Fired when any export (TXT, MD, DOCX, EPUB, JSON backup) completes.',
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _modal      = null;
let _getProject = null;
let _onProjectChange = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise webhooks module.
 * @param {{ getProject: Function, onProjectChange: Function }} opts
 */
export function initWebhooks({ getProject, onProjectChange }) {
  _getProject      = getProject;
  _onProjectChange = onProjectChange;
}

/** Open the webhooks configuration panel. */
export function openWebhooksPanel() {
  if (!_modal) {
    _modal = _buildModal();
    document.body.appendChild(_modal);
  }
  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _populate();
}

/**
 * Fire a webhook for the given event if one is configured.
 * @param {'on_save'|'on_target'|'on_snapshot'|'on_export'} event
 * @param {Object} payload  Extra data to include in the POST body
 */
export function fireWebhook(event, payload = {}) {
  const urls = _load();
  const url  = urls[event];
  if (!url) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    projectTitle: _getProject?.()?.title ?? '',
    ...payload,
  });

  fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => { /* silent — webhooks are best-effort */ });
}

/**
 * Open a batch-rename dialog for all immediate document children of a folder.
 * Pattern tokens: {n} = 1-based index, {title} = current title, {folder} = folder name
 * @param {string|null} folderId  null to rename all top-level docs
 */
export function openBatchRename(folderId) {
  const project = _getProject?.();
  if (!project) return;

  const folder  = folderId ? getDocument(project, folderId) : null;
  const docs    = project.documents.filter(d =>
    d.type === 'doc' && !d.inTrash && d.parentId === (folderId ?? null));

  if (!docs.length) {
    showToast('No documents to rename in this folder');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'snapshots-overlay'; // reuse overlay style
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="snapshots-modal" style="max-width:520px">
      <div class="snapshots-header">
        <h3>Batch Rename (${docs.length} docs)</h3>
        <button class="snapshots-close" aria-label="Close">&times;</button>
      </div>
      <div class="snapshots-body" style="flex-direction:column;gap:12px;padding:16px">
        <p style="font-size:0.85rem;color:var(--fg-muted);margin:0">
          Pattern tokens: <code>{n}</code> = number, <code>{title}</code> = current title,
          <code>{folder}</code> = folder name.
        </p>
        <div class="wh-batch-row">
          <input type="text" class="wh-pattern-input" id="batch-pattern" value="Chapter {n} — {title}" style="flex:1">
          <button class="btn" id="batch-preview-btn">Preview</button>
        </div>
        <div id="batch-preview-list" class="batch-preview" style="display:none"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
          <button class="btn btn-ghost" id="batch-cancel">Cancel</button>
          <button class="btn" id="batch-apply">Apply</button>
        </div>
      </div>
    </div>`;

  const close = () => { modal.remove(); document.body.classList.remove('modal-open'); };
  modal.querySelector('.snapshots-close').addEventListener('click', close);
  modal.querySelector('#batch-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.body.classList.add('modal-open');
  document.body.appendChild(modal);

  const previewList = modal.querySelector('#batch-preview-list');

  modal.querySelector('#batch-preview-btn').addEventListener('click', () => {
    const pattern = modal.querySelector('#batch-pattern').value;
    const previews = docs.map((d, i) => ({
      old:  d.title,
      next: _applyPattern(pattern, i + 1, d.title, folder?.title ?? ''),
    }));
    previewList.innerHTML = previews.map(p =>
      `<div class="batch-preview-row">"${_esc(p.old)}" → <span>${_esc(p.next)}</span></div>`
    ).join('');
    previewList.style.display = 'flex';
  });

  modal.querySelector('#batch-apply').addEventListener('click', () => {
    const pattern = modal.querySelector('#batch-pattern').value.trim();
    if (!pattern) { showToast('Enter a pattern first'); return; }
    docs.forEach((d, i) => {
      d.title = _applyPattern(pattern, i + 1, d.title, folder?.title ?? '');
    });
    saveProject(project);
    _onProjectChange?.(project);
    showToast(`Renamed ${docs.length} document${docs.length !== 1 ? 's' : ''}`);
    close();
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'wh-overlay';
  overlay.className = 'wh-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Automation & Webhooks');

  overlay.innerHTML = `
    <div class="wh-modal">
      <div class="wh-header">
        <h3>Automation &amp; Webhooks</h3>
        <button class="wh-close" aria-label="Close">&times;</button>
      </div>
      <div class="wh-body" id="wh-body"></div>
      <div class="wh-footer">
        <button class="btn" id="wh-save-btn">Save Webhooks</button>
      </div>
    </div>`;

  overlay.querySelector('.wh-close').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  overlay.querySelector('#wh-save-btn').addEventListener('click', _save);

  return overlay;
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function _populate() {
  const body = document.getElementById('wh-body');
  if (!body) return;

  const urls = _load();

  let html = `<p class="wh-section-title">Outbound Webhooks</p>
    <p style="font-size:0.8rem;color:var(--fg-muted);margin-bottom:12px">
      Zero Pro will POST JSON to these URLs when the corresponding event fires.
      Use services like Zapier, Make, or n8n to route events to Slack, Dropbox, Notion, etc.
    </p>`;

  EVENTS.forEach(ev => {
    html += `
      <div class="wh-event-row">
        <div class="wh-event-label">${_esc(ev.label)}</div>
        <div class="wh-event-desc">${_esc(ev.desc)}</div>
        <div class="wh-event-input-row">
          <input type="url" class="wh-url-input" data-event="${ev.id}"
                 placeholder="https://hooks.zapier.com/…"
                 value="${_esc(urls[ev.id] || '')}">
          <button class="btn btn-sm wh-test-btn" data-event="${ev.id}">Test</button>
        </div>
      </div>`;
  });

  body.innerHTML = html;

  body.querySelectorAll('.wh-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = btn.dataset.event;
      const inp = body.querySelector(`.wh-url-input[data-event="${id}"]`);
      const url = inp?.value.trim();
      if (!url) { showToast('Enter a URL first'); return; }
      btn.disabled = true;
      btn.textContent = 'Sending…';
      fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: id, test: true, timestamp: new Date().toISOString() }),
      })
        .then(() => showToast('Test webhook sent'))
        .catch(() => showToast('Webhook failed — check the URL'))
        .finally(() => { btn.disabled = false; btn.textContent = 'Test'; });
    });
  });
}

function _save() {
  const body = document.getElementById('wh-body');
  if (!body) return;
  const map = {};
  body.querySelectorAll('.wh-url-input').forEach(inp => {
    const v = inp.value.trim();
    if (v) map[inp.dataset.event] = v;
  });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); }
  catch { /* ignore */ }
  showToast('Webhooks saved');
  _close();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function _applyPattern(pattern, n, title, folder) {
  return pattern
    .replace(/\{n\}/g, String(n))
    .replace(/\{title\}/g, title)
    .replace(/\{folder\}/g, folder);
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
