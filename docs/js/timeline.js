// timeline.js — Visual Timeline view (Phase 10)
// Renders scenes as cards on a horizontal track.
// Supports two modes: narrative order and chronological order (by doc.date).
// Optional POV lanes: group scenes by pov character into separate rows.

import { saveProject } from './storage.js';
import { showToast } from './ui.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _project     = null;
let _onSelectDoc = null;
let _onProjectChange = null;
let _mode        = 'story';   // 'story' | 'chrono'
let _povLanes    = false;

// Label colour map (matches binder/corkboard)
const LABEL_COLORS = {
  red: '#e06c75', orange: '#d4956a', yellow: '#e5c07b',
  green: '#5f9e6e', blue: '#61afef', purple: '#c678dd',
  pink: '#d4869a', teal: '#56b6c2',
};

// POV lane colours (cycle through these)
const POV_COLORS = [
  '#61afef', '#c678dd', '#e5c07b', '#98c379',
  '#e06c75', '#56b6c2', '#d4956a', '#abb2bf',
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function initTimeline({ getProject, onSelectDoc, onProjectChange }) {
  _onSelectDoc     = onSelectDoc;
  _onProjectChange = onProjectChange;

  // Wire toolbar buttons (they live in index.html inside #timeline-pane)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.timeline-mode-btn');
    if (btn) {
      _mode = btn.dataset.mode;
      document.querySelectorAll('.timeline-mode-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.mode === _mode));
      renderTimeline(getProject());
    }

    const laneToggle = e.target.closest('#timeline-lane-toggle');
    if (laneToggle) {
      _povLanes = !_povLanes;
      laneToggle.setAttribute('aria-pressed', String(_povLanes));
      laneToggle.querySelector('.timeline-lane-toggle-label').textContent =
        _povLanes ? 'POV Lanes: On' : 'POV Lanes: Off';
      renderTimeline(getProject());
    }
  });
}

/** Render the timeline into #timeline-content. */
export function renderTimeline(project) {
  _project = project;
  const container = document.getElementById('timeline-content');
  if (!container) return;

  const docs = _getSceneDocs(project);

  if (!docs.length) {
    container.innerHTML = `
      <div class="timeline-empty">
        <span class="timeline-empty-icon">📅</span>
        <p>No documents to display. Create some scenes to see them here.</p>
      </div>`;
    return;
  }

  const ordered = _mode === 'chrono' ? _sortChrono(docs) : _sortNarrative(docs);

  if (_povLanes) {
    container.innerHTML = _renderLanes(ordered, project);
  } else {
    container.innerHTML = _renderSingleLane(ordered);
  }

  _initDrag(project);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function _renderSingleLane(docs) {
  return `
    <div class="timeline-lane">
      <div class="timeline-lane-label">All Scenes</div>
      <div class="timeline-cards-row" id="tl-lane-all" data-lane="all">
        ${docs.map(d => _cardHtml(d)).join('')}
      </div>
    </div>`;
}

function _renderLanes(docs, project) {
  // Group by pov
  const lanes = new Map(); // pov label → docs[]
  const noPov = [];

  docs.forEach(d => {
    const pov = (d.pov || '').trim();
    if (!pov) { noPov.push(d); return; }
    if (!lanes.has(pov)) lanes.set(pov, []);
    lanes.get(pov).push(d);
  });

  let colorIdx = 0;
  let html = '';

  lanes.forEach((laneDocs, pov) => {
    const color = POV_COLORS[colorIdx++ % POV_COLORS.length];
    html += `
      <div class="timeline-lane">
        <div class="timeline-lane-label">
          <span class="timeline-lane-dot" style="background:${color}"></span>
          ${_esc(pov)}
        </div>
        <div class="timeline-cards-row" id="tl-lane-${_esc(pov)}" data-lane="${_esc(pov)}">
          ${laneDocs.map(d => _cardHtml(d, color)).join('')}
        </div>
      </div>`;
  });

  if (noPov.length) {
    html += `
      <div class="timeline-lane">
        <div class="timeline-lane-label">
          <span class="timeline-lane-dot" style="background:var(--text-muted)"></span>
          No POV assigned
        </div>
        <div class="timeline-cards-row" id="tl-lane-none" data-lane="none">
          ${noPov.map(d => _cardHtml(d)).join('')}
        </div>
      </div>`;
  }

  return html;
}

function _cardHtml(doc, laneColor) {
  const labelColor = doc.label ? (LABEL_COLORS[doc.label] ?? '') : (laneColor ?? '');
  const dateStr    = doc.date ? `<span class="timeline-card-date">${_esc(doc.date)}</span>` : '';
  const wc         = doc.wordCount ? `<span class="timeline-card-wc">${doc.wordCount.toLocaleString()} w</span>` : '';
  const status     = doc.status && doc.status !== 'not-started'
    ? `<span class="timeline-card-status">${_esc(doc.status)}</span>` : '';

  return `
    <div class="timeline-card" data-id="${_esc(doc.id)}"
         role="button" tabindex="0" aria-label="Scene: ${_esc(doc.title || 'Untitled')}">
      ${labelColor ? `<div class="timeline-card-colour" style="background:${labelColor}"></div>` : ''}
      <div class="timeline-card-title">${_esc(doc.title || 'Untitled')}</div>
      ${doc.synopsis ? `<div class="timeline-card-synopsis">${_esc(doc.synopsis)}</div>` : ''}
      <div class="timeline-card-meta">
        ${dateStr}${wc}${status}
      </div>
    </div>`;
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function _getSceneDocs(project) {
  return (project.documents || []).filter(d =>
    d.type === 'doc' && !d.inTrash);
}

function _sortNarrative(docs) {
  return [...docs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function _sortChrono(docs) {
  return [...docs].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Infinity;
    const db = b.date ? new Date(b.date).getTime() : Infinity;
    if (!a.date && !b.date) return (a.order ?? 0) - (b.order ?? 0);
    return da - db;
  });
}

// ─── Drag-to-reorder (story mode only) ───────────────────────────────────────

function _initDrag(project) {
  if (typeof Sortable === 'undefined') return;

  document.querySelectorAll('.timeline-cards-row').forEach(row => {
    Sortable.create(row, {
      animation:   150,
      ghostClass:  'timeline-card-ghost',
      disabled:    _mode === 'chrono',
      onEnd: evt => {
        const id    = evt.item?.dataset.id;
        const newIdx = evt.newIndex ?? 0;

        // Re-order docs in this lane
        const laneId  = row.id;
        const docs    = _getSceneDocs(project);
        const ordered = _sortNarrative(docs);

        // Find all doc IDs in this lane's current visual order
        const laneDocIds = Array.from(row.querySelectorAll('.timeline-card'))
          .map(c => c.dataset.id);

        // Assign sequential order values
        let orderBase = ordered.findIndex(d => d.id === laneDocIds[0]);
        if (orderBase < 0) orderBase = 0;

        laneDocIds.forEach((docId, i) => {
          const doc = project.documents.find(d => d.id === docId);
          if (doc) doc.order = orderBase + i;
        });

        // Normalise all order values globally
        _sortNarrative(_getSceneDocs(project)).forEach((d, i) => { d.order = i; });

        _onProjectChange?.(project);
        saveProject(project);
        showToast('Scene order updated');
      },
    });
  });

  // Click to select
  document.querySelectorAll('.timeline-card').forEach(card => {
    card.addEventListener('click', () => _onSelectDoc?.(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _onSelectDoc?.(card.dataset.id);
      }
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
