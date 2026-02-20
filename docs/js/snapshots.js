// snapshots.js — Revision history, snapshot list, and diff view
// Phase 7: Nice-to-Haves & UI Polish

import {
  createSnapshot, deleteSnapshot, restoreSnapshot, getSnapshots,
  saveProject, getDocument,
} from './storage.js';
import { showToast, showPrompt, showConfirm } from './ui.js';

// ─── State ─────────────────────────────────────────────────────────────────────

let _getProject    = null;
let _getCurrentDoc = null;
let _onDocRestore  = null;  // called after restoring a snapshot to reload the editor
let _panel         = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the snapshots module.
 * @param {{ getProject: Function, getCurrentDoc: Function, onDocRestore: Function }} opts
 */
export function initSnapshots({ getProject, getCurrentDoc, onDocRestore }) {
  _getProject    = getProject;
  _getCurrentDoc = getCurrentDoc;
  _onDocRestore  = onDocRestore;
}

/** Open the snapshots panel for the current document */
export function openSnapshots() {
  const project = _getProject?.();
  const doc     = _getCurrentDoc?.();
  if (!project || !doc || doc.type !== 'doc') {
    showToast('Select a document first');
    return;
  }
  _showPanel(project, doc);
}

/** Take a snapshot of the current document (with optional name prompt) */
export function takeSnapshot(promptName = true) {
  const project = _getProject?.();
  const doc     = _getCurrentDoc?.();
  if (!project || !doc || doc.type !== 'doc') {
    showToast('Select a document first');
    return;
  }

  const doSnap = (name) => {
    createSnapshot(project, doc.id, name);
    saveProject(project);
    showToast(`Snapshot saved: ${name || 'Untitled'}`);
    // Refresh panel if open
    if (_panel && !_panel.classList.contains('hidden')) {
      _renderList(project, doc);
    }
  };

  if (promptName) {
    showPrompt('Snapshot Name', 'Name this snapshot…', '', name => doSnap(name));
  } else {
    doSnap('');
  }
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function _showPanel(project, doc) {
  if (!_panel) {
    _panel = _buildPanel();
    document.body.appendChild(_panel);
  }

  _panel.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _renderList(project, doc);
}

function _closePanel() {
  _panel?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function _buildPanel() {
  const overlay = document.createElement('div');
  overlay.id        = 'snapshots-overlay';
  overlay.className = 'snapshots-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Revision History');

  overlay.innerHTML = `
    <div class="snapshots-modal">
      <div class="snapshots-header">
        <h3>Revision History</h3>
        <button class="snapshots-close" aria-label="Close">&times;</button>
      </div>
      <div class="snapshots-body">
        <div class="snapshots-list" id="snapshots-list"></div>
        <div class="snapshots-diff" id="snapshots-diff">
          <p class="snapshots-diff-empty">Select a snapshot to compare with the current version.</p>
        </div>
      </div>
    </div>
  `;

  overlay.querySelector('.snapshots-close').addEventListener('click', _closePanel);
  overlay.addEventListener('click', e => { if (e.target === overlay) _closePanel(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _panel && !_panel.classList.contains('hidden')) _closePanel();
  });

  return overlay;
}

function _renderList(project, doc) {
  const list = document.getElementById('snapshots-list');
  const diff = document.getElementById('snapshots-diff');
  if (!list) return;

  const snaps = getSnapshots(doc.id, project);

  if (!snaps.length) {
    list.innerHTML = '<p class="snapshots-empty">No snapshots yet.<br>Click "Take Snapshot" to save a revision.</p>';
    if (diff) diff.innerHTML = '<p class="snapshots-diff-empty">No snapshots to compare.</p>';
    return;
  }

  list.innerHTML = '';
  snaps.forEach(snap => {
    const item = document.createElement('div');
    item.className = 'snapshot-item';
    item.dataset.id = snap.id;

    const date = new Date(snap.createdAt);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    item.innerHTML = `
      <div class="snapshot-info">
        <span class="snapshot-name">${_esc(snap.name)}</span>
        <span class="snapshot-meta">${dateStr} ${timeStr} &mdash; ${snap.wordCount.toLocaleString()} words</span>
      </div>
      <div class="snapshot-actions">
        <button class="snap-btn snap-diff" title="Compare with current">Diff</button>
        <button class="snap-btn snap-restore" title="Restore this snapshot">Restore</button>
        <button class="snap-btn snap-delete" title="Delete snapshot">&times;</button>
      </div>
    `;

    item.querySelector('.snap-diff').addEventListener('click', () => {
      _showDiff(project, doc, snap);
      list.querySelectorAll('.snapshot-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });

    item.querySelector('.snap-restore').addEventListener('click', () => {
      showConfirm(`Restore "${snap.name}"? Current content will be replaced.`, () => {
        restoreSnapshot(project, doc.id, snap.id);
        saveProject(project);
        _onDocRestore?.(doc.id);
        showToast('Snapshot restored');
        _closePanel();
      });
    });

    item.querySelector('.snap-delete').addEventListener('click', () => {
      deleteSnapshot(project, doc.id, snap.id);
      saveProject(project);
      _renderList(project, doc);
      showToast('Snapshot deleted');
    });

    list.appendChild(item);
  });
}

// ─── Diff View ────────────────────────────────────────────────────────────────

function _showDiff(project, doc, snapshot) {
  const diffEl = document.getElementById('snapshots-diff');
  if (!diffEl) return;

  const currentText = _htmlToText(doc.content || '');
  const snapText    = _htmlToText(snapshot.content || '');

  const diffs = _computeDiff(snapText.split('\n'), currentText.split('\n'));

  let html = '<div class="diff-header"><span class="diff-old-label">Snapshot</span><span class="diff-new-label">Current</span></div>';
  html += '<div class="diff-content">';

  diffs.forEach(d => {
    const line = _esc(d.text);
    if (d.type === 'removed') {
      html += `<div class="diff-line diff-removed"><span class="diff-sign">−</span>${line}</div>`;
    } else if (d.type === 'added') {
      html += `<div class="diff-line diff-added"><span class="diff-sign">+</span>${line}</div>`;
    } else {
      html += `<div class="diff-line diff-same"><span class="diff-sign"> </span>${line}</div>`;
    }
  });

  html += '</div>';
  diffEl.innerHTML = html;
}

/** Simple LCS-based line diff */
function _computeDiff(oldLines, newLines) {
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'same', text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').trim();
}

function _esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
