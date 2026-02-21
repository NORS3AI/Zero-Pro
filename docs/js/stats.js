// stats.js — Writing Statistics Dashboard (Phase 11)
// Bar-chart view of historical word counts: daily / weekly / monthly.
// Velocity metric, longest / current streak, CSV export.

import { loadStreak } from './storage.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _modal = null;
let _currentTab = 'daily';   // 'daily' | 'weekly' | 'monthly'
let _tooltip    = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Open the statistics dashboard modal. */
export function openStatsPanel() {
  if (!_modal) {
    _modal   = _buildModal();
    _tooltip = _buildTooltip();
    document.body.appendChild(_modal);
    document.body.appendChild(_tooltip);
  }
  _modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  _currentTab = 'daily';
  _render();
}

// ─── Modal Construction ───────────────────────────────────────────────────────

function _buildModal() {
  const overlay = document.createElement('div');
  overlay.id        = 'stats-overlay';
  overlay.className = 'stats-overlay hidden';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Writing Statistics');

  overlay.innerHTML = `
    <div class="stats-modal">
      <div class="stats-header">
        <h3>Writing Statistics</h3>
        <button class="stats-close" aria-label="Close">&times;</button>
      </div>

      <div class="stats-body">
        <div class="stats-summary" id="stats-summary"></div>

        <div class="stats-tabs" role="tablist">
          <button class="stats-tab active" data-tab="daily"   role="tab" aria-selected="true">Daily (30d)</button>
          <button class="stats-tab"        data-tab="weekly"  role="tab" aria-selected="false">Weekly (12w)</button>
          <button class="stats-tab"        data-tab="monthly" role="tab" aria-selected="false">Monthly (12m)</button>
        </div>

        <div class="stats-chart-wrap">
          <svg id="stats-chart-svg" class="stats-chart-svg" aria-label="Word count chart"></svg>
        </div>
      </div>

      <div class="stats-footer">
        <button class="btn stats-csv-btn" id="stats-csv-btn">Export CSV</button>
      </div>
    </div>`;

  overlay.querySelector('.stats-close').addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modal && !_modal.classList.contains('hidden')) _close();
  });

  overlay.querySelectorAll('.stats-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.stats-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      _currentTab = btn.dataset.tab;
      _renderChart();
    });
  });

  overlay.querySelector('#stats-csv-btn').addEventListener('click', _exportCsv);

  return overlay;
}

function _buildTooltip() {
  const t = document.createElement('div');
  t.className = 'stats-tooltip';
  t.style.display = 'none';
  return t;
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  if (_tooltip) _tooltip.style.display = 'none';
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function _render() {
  _renderSummary();
  _renderChart();
}

function _renderSummary() {
  const el  = document.getElementById('stats-summary');
  if (!el) return;

  const { days } = loadStreak();
  const today     = new Date().toISOString().slice(0, 10);
  const todayWc   = days[today] || 0;
  const current   = _currentStreak(days);
  const longest   = _longestStreak(days);
  const totalWc   = Object.values(days).reduce((s, n) => s + n, 0);
  const activeDays = Object.values(days).filter(v => v > 0).length;
  const velocity  = activeDays > 0 ? Math.round(totalWc / activeDays) : 0;

  el.innerHTML = [
    ['Today',          todayWc.toLocaleString()],
    ['Avg Words/Day',  velocity.toLocaleString()],
    ['Current Streak', `${current}d`],
    ['Longest Streak', `${longest}d`],
    ['Total Words',    totalWc.toLocaleString()],
    ['Days Written',   activeDays.toLocaleString()],
  ].map(([label, num]) => `
    <div class="stats-pill">
      <span class="stats-pill-num">${num}</span>
      <span class="stats-pill-label">${label}</span>
    </div>
  `).join('');
}

function _renderChart() {
  const svgEl = document.getElementById('stats-chart-svg');
  if (!svgEl) return;

  const { days } = loadStreak();
  const bars  = _buildBars(days, _currentTab);
  if (!bars.length) {
    svgEl.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="var(--fg-muted)" font-size="14" dy="0.35em">No data yet — start writing to see your history.</text>';
    svgEl.setAttribute('viewBox', '0 0 600 120');
    return;
  }

  const W = 760, H = 200, PAD = { top: 12, right: 16, bottom: 36, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const maxVal  = Math.max(1, ...bars.map(b => b.value));
  const barW    = Math.max(4, Math.floor(chartW / bars.length) - 2);
  const gap     = Math.floor(chartW / bars.length);

  // Y-axis ticks
  const ticks    = _niceYTicks(maxVal, 4);
  const lastTick = ticks[ticks.length - 1];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"
              class="stats-chart-svg" aria-label="Word count bar chart">`;

  // Grid lines + y labels
  ticks.forEach(tick => {
    const y = PAD.top + chartH - (tick / lastTick) * chartH;
    svg += `<line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${PAD.left + chartW}" y2="${y.toFixed(1)}" class="stats-grid-line"/>`;
    svg += `<text x="${PAD.left - 6}" y="${y.toFixed(1)}" class="stats-axis-label" text-anchor="end" dy="0.35em">${_fmtK(tick)}</text>`;
  });

  // Bars
  bars.forEach((bar, i) => {
    const x     = PAD.left + i * gap + (gap - barW) / 2;
    const barH  = Math.max(1, (bar.value / lastTick) * chartH);
    const y     = PAD.top + chartH - barH;
    svg += `<rect class="stats-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}"
              width="${barW}" height="${barH.toFixed(1)}"
              data-label="${_esc(bar.label)}" data-value="${bar.value}"
              rx="2" tabindex="0" aria-label="${_esc(bar.label)}: ${bar.value.toLocaleString()} words"/>`;

    // X labels — show every Nth to avoid crowding
    const every = Math.ceil(bars.length / 15);
    if (i % every === 0) {
      svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${H - PAD.bottom + 14}" class="stats-axis-label" text-anchor="middle">${_esc(bar.shortLabel)}</text>`;
    }
  });

  svg += '</svg>';
  svgEl.outerHTML = svg;

  // Re-query because we replaced outerHTML
  const newSvg = document.getElementById('stats-chart-svg') ?? document.querySelector('.stats-chart-svg');
  if (newSvg) {
    newSvg.querySelectorAll('.stats-bar').forEach(rect => {
      rect.addEventListener('mouseenter', e => {
        const r = rect.getBoundingClientRect();
        const value = parseInt(rect.dataset.value, 10) || 0;
        _tooltip.textContent = `${rect.dataset.label}: ${value.toLocaleString()} words`;
        _tooltip.style.display = 'block';
        _tooltip.style.top  = `${r.top - 36 + window.scrollY}px`;
        _tooltip.style.left = `${r.left + r.width / 2 - _tooltip.offsetWidth / 2}px`;
      });
      rect.addEventListener('mouseleave', () => { _tooltip.style.display = 'none'; });
    });
  }
}

// ─── Bar Data Construction ────────────────────────────────────────────────────

function _buildBars(days, tab) {
  if (tab === 'daily')   return _dailyBars(days, 30);
  if (tab === 'weekly')  return _weeklyBars(days, 12);
  if (tab === 'monthly') return _monthlyBars(days, 12);
  return [];
}

function _dailyBars(days, count) {
  const bars = [];
  const d = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const cur  = new Date(d);
    cur.setDate(cur.getDate() - i);
    const key  = cur.toISOString().slice(0, 10);
    const [, mo, da] = key.split('-');
    bars.push({ label: key, shortLabel: `${parseInt(mo)}/${parseInt(da)}`, value: days[key] || 0 });
  }
  return bars;
}

function _weeklyBars(days, count) {
  const bars = [];
  const d = new Date();
  // Align to start of this week (Sunday)
  d.setDate(d.getDate() - d.getDay());
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(d);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    let total = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      total += days[key] || 0;
      cur.setDate(cur.getDate() + 1);
    }
    const label = start.toISOString().slice(0, 10);
    const mo    = start.getMonth() + 1;
    const da    = start.getDate();
    bars.push({ label: `Wk ${label}`, shortLabel: `${mo}/${da}`, value: total });
  }
  return bars;
}

function _monthlyBars(days, count) {
  const bars = [];
  const now  = new Date();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr  = d.getFullYear();
    const mo  = d.getMonth();
    const prefix = `${yr}-${String(mo + 1).padStart(2, '0')}-`;
    const total = Object.entries(days)
      .filter(([k]) => k.startsWith(prefix))
      .reduce((s, [, v]) => s + v, 0);
    bars.push({ label: `${monthNames[mo]} ${yr}`, shortLabel: monthNames[mo], value: total });
  }
  return bars;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function _exportCsv() {
  const { days } = loadStreak();
  const rows = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, words]) => `${date},${words}`);

  const csv  = 'Date,Words Written\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `zeropro-stats-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _niceYTicks(maxVal, count) {
  const raw  = maxVal / count;
  const mag  = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const nice = Math.ceil(raw / mag) * mag || 1;
  const ticks = [];
  for (let i = 1; i <= count; i++) ticks.push(nice * i);
  return ticks;
}

function _fmtK(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

function _currentStreak(days) {
  let count = 0;
  const d = new Date();
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
  let max = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000);
    if (diff === 1) { cur++; if (cur > max) max = cur; } else { cur = 1; }
  }
  return max;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
