// sprint.js — Writing Sprint Timer (Phase 13)
// Floating HUD with a ring countdown, live WPM, and sprint history.
// Word-count progress tracked by comparing against baseline at sprint start.

import { showToast } from './ui.js';

const STORAGE_KEY = 'zp_sprints';
const PRESETS     = [5, 15, 25, 45]; // minutes

// ─── State ────────────────────────────────────────────────────────────────────

let _getCurrentWordCount = null; // () => number
let _hud         = null;
let _resultEl    = null;
let _durationMin = 25;
let _totalSecs   = 0;
let _remainSecs  = 0;
let _timer       = null;
let _running     = false;
let _baseWords   = 0;
let _sprintWords = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the sprint module.
 * @param {{ getCurrentWordCount: Function }} opts
 */
export function initSprint({ getCurrentWordCount }) {
  _getCurrentWordCount = getCurrentWordCount;
}

/** Toggle the sprint HUD visibility. */
export function toggleSprintPanel() {
  if (!_hud) {
    _hud      = _buildHud();
    _resultEl = _buildResultCard();
    document.body.appendChild(_hud);
    document.body.appendChild(_resultEl);
  }
  _hud.classList.toggle('hidden');
  if (!_hud.classList.contains('hidden')) _selectPreset(_durationMin);
}

/** Called by app when document changes (to track new words during the sprint). */
export function sprintOnDocChange(currentWordCount) {
  if (!_running) return;
  const newWords = currentWordCount - _baseWords;
  if (newWords > _sprintWords) {
    _sprintWords = newWords;
    _updateStats();
  }
}

// ─── HUD Construction ─────────────────────────────────────────────────────────

function _buildHud() {
  const hud = document.createElement('div');
  hud.id        = 'sprint-hud';
  hud.className = 'hidden';
  hud.setAttribute('aria-label', 'Writing Sprint Timer');

  const circumference = 2 * Math.PI * 42; // r=42

  hud.innerHTML = `
    <div class="sprint-hud-header">
      <span class="sprint-hud-title">Sprint Timer</span>
      <button class="sprint-hud-close" aria-label="Close sprint timer">&times;</button>
    </div>

    <div class="sprint-timer-ring">
      <svg class="sprint-ring-svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="sprint-ring-track" cx="50" cy="50" r="42"/>
        <circle class="sprint-ring-fill"  cx="50" cy="50" r="42"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="0"
                id="sprint-ring-fill"/>
      </svg>
      <span class="sprint-time-label" id="sprint-time-label">25:00</span>
    </div>

    <div class="sprint-stats">
      <div class="sprint-stat">
        <span class="sprint-stat-num" id="sprint-words">0</span>
        <span class="sprint-stat-label">Words</span>
      </div>
      <div class="sprint-stat">
        <span class="sprint-stat-num" id="sprint-wpm">—</span>
        <span class="sprint-stat-label">WPM</span>
      </div>
    </div>

    <div class="sprint-presets" id="sprint-presets">
      ${PRESETS.map(m => `<button class="sprint-preset-btn" data-min="${m}">${m}m</button>`).join('')}
    </div>

    <div class="sprint-controls">
      <button class="sprint-btn primary" id="sprint-start-btn">Start</button>
      <button class="sprint-btn" id="sprint-reset-btn">Reset</button>
    </div>`;

  hud.querySelector('.sprint-hud-close').addEventListener('click', () => {
    if (_running) { _pauseSprint(); }
    hud.classList.add('hidden');
  });

  hud.querySelectorAll('.sprint-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_running) return;
      _selectPreset(parseInt(btn.dataset.min, 10));
    });
  });

  hud.querySelector('#sprint-start-btn').addEventListener('click', () => {
    if (_running) _pauseSprint(); else _startSprint();
  });

  hud.querySelector('#sprint-reset-btn').addEventListener('click', _resetSprint);

  return hud;
}

function _buildResultCard() {
  const el = document.createElement('div');
  el.className = 'sprint-result-overlay hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Sprint Complete');

  el.innerHTML = `
    <div class="sprint-result-card">
      <div class="sprint-result-emoji" id="sprint-res-emoji">🎉</div>
      <div class="sprint-result-title" id="sprint-res-title">Sprint Complete!</div>
      <div class="sprint-result-sub"   id="sprint-res-sub"></div>
      <div class="sprint-result-nums">
        <div>
          <span class="sprint-result-num"  id="sprint-res-words">0</span>
          <span class="sprint-result-numlbl">Words</span>
        </div>
        <div>
          <span class="sprint-result-num"  id="sprint-res-wpm">—</span>
          <span class="sprint-result-numlbl">Avg WPM</span>
        </div>
      </div>
      <button class="btn" id="sprint-res-close">Close</button>
    </div>`;

  el.querySelector('#sprint-res-close').addEventListener('click', () => {
    el.classList.add('hidden');
  });
  el.addEventListener('click', e => { if (e.target === el) el.classList.add('hidden'); });

  return el;
}

// ─── Timer Logic ──────────────────────────────────────────────────────────────

function _selectPreset(mins) {
  _durationMin = mins;
  _totalSecs   = mins * 60;
  _remainSecs  = _totalSecs;
  _sprintWords = 0;
  _hud?.querySelectorAll('.sprint-preset-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.min, 10) === mins);
  });
  _updateDisplay();
}

function _startSprint() {
  if (_remainSecs <= 0) _selectPreset(_durationMin);
  _baseWords   = _getCurrentWordCount?.() ?? 0;
  _sprintWords = 0;
  _running     = true;
  document.getElementById('sprint-start-btn').textContent = 'Pause';
  _tick();
  _timer = setInterval(_tick, 1000);
}

function _pauseSprint() {
  _running = false;
  clearInterval(_timer);
  document.getElementById('sprint-start-btn').textContent = 'Resume';
}

function _resetSprint() {
  _running = false;
  clearInterval(_timer);
  _sprintWords = 0;
  _selectPreset(_durationMin);
  document.getElementById('sprint-start-btn').textContent = 'Start';
}

function _tick() {
  _remainSecs = Math.max(0, _remainSecs - 1);
  _updateDisplay();
  _updateStats();
  if (_remainSecs === 0) {
    _running = false;
    clearInterval(_timer);
    _showResult();
  }
}

function _updateDisplay() {
  const min = Math.floor(_remainSecs / 60);
  const sec = _remainSecs % 60;
  const label = document.getElementById('sprint-time-label');
  if (label) label.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  const fill = document.getElementById('sprint-ring-fill');
  if (fill) {
    const circumference = 2 * Math.PI * 42;
    const progress = _totalSecs > 0 ? _remainSecs / _totalSecs : 1;
    fill.style.strokeDashoffset = circumference * (1 - progress);
  }
}

function _updateStats() {
  const wordsEl = document.getElementById('sprint-words');
  const wpmEl   = document.getElementById('sprint-wpm');
  if (wordsEl) wordsEl.textContent = _sprintWords.toLocaleString();

  const elapsedMin = (_totalSecs - _remainSecs) / 60;
  const wpm = elapsedMin > 0 ? Math.round(_sprintWords / elapsedMin) : 0;
  if (wpmEl) wpmEl.textContent = _sprintWords > 0 ? wpm : '—';
}

function _showResult() {
  if (!_resultEl) return;

  const elapsedMin = _durationMin;
  const wpm = elapsedMin > 0 ? Math.round(_sprintWords / elapsedMin) : 0;

  // Emoji based on word count
  const emoji = _sprintWords >= 1000 ? '🔥' : _sprintWords >= 500 ? '🎉' : _sprintWords >= 100 ? '✨' : '📝';
  const sub   = _sprintWords === 0 ? 'No words counted — try again!' : `In ${_durationMin} minutes`;

  document.getElementById('sprint-res-emoji').textContent  = emoji;
  document.getElementById('sprint-res-sub').textContent    = sub;
  document.getElementById('sprint-res-words').textContent  = _sprintWords.toLocaleString();
  document.getElementById('sprint-res-wpm').textContent    = _sprintWords > 0 ? wpm : '—';

  // Personal-best check
  const best = _loadBest();
  if (_sprintWords > 0 && _sprintWords >= best) {
    _saveBest(_sprintWords);
    document.getElementById('sprint-res-title').textContent = _sprintWords > best ? '🏆 New Personal Best!' : 'Sprint Complete!';
  } else {
    document.getElementById('sprint-res-title').textContent = 'Sprint Complete!';
  }

  _saveSession({ duration: _durationMin, words: _sprintWords, wpm, date: Date.now() });
  _resultEl.classList.remove('hidden');
  document.getElementById('sprint-start-btn').textContent = 'Start';
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function _loadBest() {
  try { return parseInt(localStorage.getItem('zp_sprint_best') || '0', 10); } catch { return 0; }
}
function _saveBest(n) {
  try { localStorage.setItem('zp_sprint_best', String(n)); } catch { /* ignore */ }
}
function _saveSession(session) {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    sessions.unshift(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
  } catch { /* ignore */ }
}
