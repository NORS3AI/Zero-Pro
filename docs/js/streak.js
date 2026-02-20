// streak.js — Writing streak calendar and daily word count tracker
// Phase 7: Nice-to-Haves & UI Polish

import { loadStreak, recordDailyWords } from './storage.js';

// ─── State ─────────────────────────────────────────────────────────────────────

let _getProject   = null;
let _panel        = null;
let _lastWordCount = 0;  // track words to compute delta on each save

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the streak tracker.
 * @param {{ getProject: () => Object }} opts
 */
export function initStreak({ getProject }) {
  _getProject = getProject;
}

/** Called by the editor on each save to accumulate words written today */
export function trackWordsWritten(currentWordCount) {
  if (_lastWordCount > 0 && currentWordCount > _lastWordCount) {
    const delta = currentWordCount - _lastWordCount;
    recordDailyWords(delta);
  }
  _lastWordCount = currentWordCount;
}

/** Reset the baseline when switching documents */
export function resetWordBaseline(wordCount) {
  _lastWordCount = wordCount || 0;
}

/** Open the streak calendar modal */
export function openStreakCalendar() {
  if (!_panel) {
    _panel = _buildPanel();
    document.body.appendChild(_panel);
  }
  _renderCalendar();
  _panel.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function _closePanel() {
  _panel?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function _buildPanel() {
  const overlay = document.createElement('div');
  overlay.id        = 'streak-overlay';
  overlay.className = 'streak-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Writing Streak');

  overlay.innerHTML = `
    <div class="streak-modal">
      <div class="streak-header">
        <h3>Writing Streak</h3>
        <button class="streak-close" aria-label="Close">&times;</button>
      </div>
      <div class="streak-stats" id="streak-stats"></div>
      <div class="streak-calendar" id="streak-calendar"></div>
    </div>
  `;

  overlay.querySelector('.streak-close').addEventListener('click', _closePanel);
  overlay.addEventListener('click', e => { if (e.target === overlay) _closePanel(); });

  return overlay;
}

function _renderCalendar() {
  const streak = loadStreak();
  const days   = streak.days || {};

  _renderStats(days);
  _renderGrid(days);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function _renderStats(days) {
  const statsEl = document.getElementById('streak-stats');
  if (!statsEl) return;

  const today     = new Date().toISOString().slice(0, 10);
  const todayWc   = days[today] || 0;
  const current   = _currentStreak(days);
  const longest   = _longestStreak(days);
  const totalDays = Object.keys(days).filter(d => days[d] > 0).length;
  const totalWc   = Object.values(days).reduce((s, n) => s + n, 0);

  statsEl.innerHTML = `
    <div class="streak-stat">
      <span class="streak-stat-num">${todayWc.toLocaleString()}</span>
      <span class="streak-stat-label">Today</span>
    </div>
    <div class="streak-stat">
      <span class="streak-stat-num">${current}</span>
      <span class="streak-stat-label">Current Streak</span>
    </div>
    <div class="streak-stat">
      <span class="streak-stat-num">${longest}</span>
      <span class="streak-stat-label">Longest Streak</span>
    </div>
    <div class="streak-stat">
      <span class="streak-stat-num">${totalDays}</span>
      <span class="streak-stat-label">Days Written</span>
    </div>
    <div class="streak-stat">
      <span class="streak-stat-num">${totalWc.toLocaleString()}</span>
      <span class="streak-stat-label">Total Words</span>
    </div>
  `;
}

// ─── Grid (last 6 months, GitHub-style) ─────────────────────────────────────

function _renderGrid(days) {
  const calEl = document.getElementById('streak-calendar');
  if (!calEl) return;

  const today = new Date();
  const months = 6;
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // align to Sunday

  const maxWc = Math.max(1, ...Object.values(days));

  let html = '<div class="streak-grid">';

  // Day labels
  html += '<div class="streak-day-labels">';
  ['', 'Mon', '', 'Wed', '', 'Fri', ''].forEach(d => {
    html += `<span class="streak-day-label">${d}</span>`;
  });
  html += '</div>';

  html += '<div class="streak-weeks">';

  const cursor = new Date(startDate);
  while (cursor <= today) {
    html += '<div class="streak-week">';
    for (let dow = 0; dow < 7; dow++) {
      const key = cursor.toISOString().slice(0, 10);
      const wc  = days[key] || 0;
      const level = wc === 0 ? 0 : Math.min(4, Math.ceil((wc / maxWc) * 4));
      const isFuture = cursor > today;

      if (isFuture) {
        html += '<span class="streak-cell streak-empty"></span>';
      } else {
        const title = `${key}: ${wc.toLocaleString()} words`;
        html += `<span class="streak-cell streak-level-${level}" title="${title}"></span>`;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    html += '</div>';
  }

  html += '</div></div>';

  // Month labels
  html += '<div class="streak-month-labels">';
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labelCursor = new Date(startDate);
  let lastMonth = -1;
  while (labelCursor <= today) {
    if (labelCursor.getMonth() !== lastMonth) {
      lastMonth = labelCursor.getMonth();
      html += `<span class="streak-month-label">${monthNames[lastMonth]}</span>`;
    }
    labelCursor.setDate(labelCursor.getDate() + 7);
  }
  html += '</div>';

  calEl.innerHTML = html;
}

// ─── Streak Calculation ─────────────────────────────────────────────────────

function _currentStreak(days) {
  let count = 0;
  const d = new Date();
  // Start from today or yesterday
  let key = d.toISOString().slice(0, 10);
  if (!days[key] || days[key] <= 0) {
    d.setDate(d.getDate() - 1);
    key = d.toISOString().slice(0, 10);
    if (!days[key] || days[key] <= 0) return 0;
  }

  while (days[key] && days[key] > 0) {
    count++;
    d.setDate(d.getDate() - 1);
    key = d.toISOString().slice(0, 10);
  }
  return count;
}

function _longestStreak(days) {
  const sorted = Object.keys(days).filter(d => days[d] > 0).sort();
  if (!sorted.length) return 0;

  let max = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      current++;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }
  return max;
}
