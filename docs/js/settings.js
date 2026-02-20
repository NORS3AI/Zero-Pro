// settings.js — Settings modal: themes, typography, editor preferences
// Phase 9: UX Modernisation

import { saveProject } from './storage.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_MAP = {
  georgia: "Georgia, 'Times New Roman', serif",
  system:  "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono:    "'Courier New', Courier, monospace",
};

const THEME_OPTIONS = [
  { value: 'dark',      label: 'Dark',       bg: '#1a1a1c', text: '#ede9e1' },
  { value: 'light',     label: 'Light',      bg: '#f8f5f0', text: '#292520' },
  { value: 'sepia',     label: 'Sepia',      bg: '#f4ede4', text: '#3d2b1f' },
  { value: 'pure-dark', label: 'Pure Dark',  bg: '#000000', text: '#ede9e1' },
];

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: '◑' },
  { id: 'editor',     label: 'Editor',     icon: '✎' },
  { id: 'export',     label: 'Export',     icon: '↓' },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _project         = null;
let _getProject      = null;
let _onSettingsChange = null;
let _activeSection   = 'appearance';
let _modal           = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the settings module. Call once at app boot.
 * @param {{ getProject: () => Object, onSettingsChange: (project: Object) => void }} opts
 */
export function initSettings({ getProject, onSettingsChange }) {
  _getProject       = getProject;
  _onSettingsChange = onSettingsChange;
  _buildModal();

  // Global shortcut: Ctrl+, opens settings
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      openSettings();
    }
  });
}

/**
 * Open the settings modal, optionally jumping to a section.
 * @param {'appearance'|'editor'|'export'} [section]
 */
export function openSettings(section) {
  _project = _getProject();
  if (section) _activeSection = section;
  _populateModal();
  _modal?.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

/**
 * Apply typography CSS variables to :root from settings object.
 * @param {Object} settings
 */
export function applyTypography(settings) {
  const root = document.documentElement;
  root.style.setProperty('--editor-font', FONT_MAP[settings?.font] ?? FONT_MAP.georgia);
  root.style.setProperty('--editor-size', `${settings?.fontSize ?? 18}px`);
  root.style.setProperty('--editor-lh',   String(settings?.lineHeight ?? 1.8));
}

/**
 * Apply all editor settings (typography + spellcheck + indent).
 * @param {Object} settings
 */
export function applyEditorSettings(settings) {
  applyTypography(settings);
  const editor = document.getElementById('editor');
  if (editor) {
    editor.spellcheck = settings?.spellcheck !== false;
    editor.classList.toggle('no-indent', settings?.indent === false);
    if (settings?.spellLang) {
      editor.setAttribute('lang', settings.spellLang);
    } else {
      editor.removeAttribute('lang');
    }
  }
}

// ─── Modal Construction ───────────────────────────────────────────────────────

function _buildModal() {
  const wrap = document.createElement('div');
  wrap.id        = 'settings-overlay';
  wrap.className = 'settings-overlay hidden';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Settings');

  wrap.innerHTML = `
    <div class="settings-modal">

      <!-- Close button — red X in top-right corner -->
      <button class="settings-close-btn" id="btn-settings-close" aria-label="Close settings">
        <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z"/>
        </svg>
      </button>

      <!-- Sidebar nav -->
      <nav class="settings-sidebar" aria-label="Settings sections">
        <div class="settings-sidebar-title">Settings</div>
        ${SECTIONS.map(s => `
          <button class="settings-nav-item" data-section="${s.id}" aria-pressed="false">
            <span class="settings-nav-icon" aria-hidden="true">${s.icon}</span>
            <span class="settings-nav-label">${s.label}</span>
          </button>
        `).join('')}
      </nav>

      <!-- Content area -->
      <div class="settings-body" id="settings-body">
        <!-- Populated by _populateModal() -->
      </div>

    </div>
  `;

  document.body.appendChild(wrap);
  _modal = wrap;

  // Red X close button
  wrap.querySelector('#btn-settings-close')?.addEventListener('click', _close);

  // Click backdrop → close
  wrap.addEventListener('click', e => {
    if (e.target === wrap) _close();
  });

  // Escape → close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !wrap.classList.contains('hidden')) _close();
  });

  // Sidebar nav clicks
  wrap.addEventListener('click', e => {
    const item = e.target.closest('.settings-nav-item');
    if (!item) return;
    _activeSection = item.dataset.section;
    _populateModal();
  });
}

function _close() {
  _modal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

// ─── Population ───────────────────────────────────────────────────────────────

function _populateModal() {
  if (!_modal) return;
  _project = _getProject();
  const settings = _project?.settings ?? {};

  // Update nav active states
  _modal.querySelectorAll('.settings-nav-item').forEach(btn => {
    const active = btn.dataset.section === _activeSection;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const body = document.getElementById('settings-body');
  if (!body) return;

  if (_activeSection === 'appearance') {
    body.innerHTML = _buildAppearanceSection(settings);
    _bindAppearanceEvents(settings);
  } else if (_activeSection === 'editor') {
    body.innerHTML = _buildEditorSection(settings);
    _bindEditorEvents(settings);
  } else if (_activeSection === 'export') {
    body.innerHTML = _buildExportSection(settings);
    _bindExportEvents(settings);
  }
}

// ─── Appearance Section ───────────────────────────────────────────────────────

function _buildAppearanceSection(settings) {
  const current   = settings.theme || 'dark';
  const accentHue = settings.accentHue ?? 38;  // default golden hue
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">Appearance</h3>

      <div class="settings-field">
        <label class="settings-label">Theme</label>
        <div class="settings-theme-grid" role="radiogroup" aria-label="Theme">
          ${THEME_OPTIONS.map(t => `
            <button class="settings-theme-btn${t.value === current ? ' active' : ''}"
                    data-theme="${t.value}"
                    role="radio"
                    aria-checked="${t.value === current}"
                    title="${t.label}">
              <span class="swatch-preview"
                    style="background:${t.bg};color:${t.text}">Aa</span>
              <span class="swatch-label">${t.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="settings-field">
        <label class="settings-label" for="settings-accent-hue">
          Accent Colour — <span id="settings-accent-preview" class="accent-preview" style="background:hsl(${accentHue},55%,60%)"></span>
        </label>
        <input type="range" id="settings-accent-hue" class="settings-range accent-range"
               min="0" max="360" step="1" value="${accentHue}">
      </div>
    </div>
  `;
}

function _bindAppearanceEvents(settings) {
  _modal?.querySelectorAll('.settings-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      _modal.querySelectorAll('.settings-theme-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.theme === theme);
        b.setAttribute('aria-checked', b.dataset.theme === theme ? 'true' : 'false');
      });
      _saveSetting('theme', theme);
    });
  });

  // Accent colour hue slider
  const hueSlider = document.getElementById('settings-accent-hue');
  const preview   = document.getElementById('settings-accent-preview');
  hueSlider?.addEventListener('input', () => {
    const hue = parseInt(hueSlider.value, 10);
    applyAccentHue(hue);
    if (preview) preview.style.background = `hsl(${hue},55%,60%)`;
    _saveSetting('accentHue', hue);
  });
}

// ─── Editor Section ───────────────────────────────────────────────────────────

function _buildEditorSection(settings) {
  const font      = settings.font       ?? 'georgia';
  const fontSize  = settings.fontSize   ?? 18;
  const lineHeight = settings.lineHeight ?? 1.8;
  const spellcheck = settings.spellcheck !== false;
  const indent     = settings.indent !== false;
  const spellLang  = settings.spellLang  ?? '';

  return `
    <div class="settings-section">
      <h3 class="settings-section-title">Editor</h3>

      <div class="settings-field">
        <label class="settings-label">Font Family</label>
        <div class="settings-btn-group" role="radiogroup" aria-label="Font family">
          <button class="settings-group-btn${font === 'georgia' ? ' active' : ''}"
                  data-font="georgia" role="radio" aria-checked="${font === 'georgia'}">
            <span style="font-family:Georgia,serif">Serif</span>
          </button>
          <button class="settings-group-btn${font === 'system' ? ' active' : ''}"
                  data-font="system" role="radio" aria-checked="${font === 'system'}">
            <span style="font-family:system-ui,sans-serif">Sans</span>
          </button>
          <button class="settings-group-btn${font === 'mono' ? ' active' : ''}"
                  data-font="mono" role="radio" aria-checked="${font === 'mono'}">
            <span style="font-family:'Courier New',monospace">Mono</span>
          </button>
        </div>
      </div>

      <div class="settings-field">
        <label class="settings-label" for="settings-font-size">
          Font Size — <span id="settings-font-size-val">${fontSize}px</span>
        </label>
        <input type="range" id="settings-font-size" class="settings-range"
               min="13" max="26" step="1" value="${fontSize}">
      </div>

      <div class="settings-field">
        <label class="settings-label" for="settings-line-height">
          Line Height — <span id="settings-lh-val">${lineHeight}</span>
        </label>
        <input type="range" id="settings-line-height" class="settings-range"
               min="1.3" max="2.4" step="0.1" value="${lineHeight}">
      </div>

      <div class="settings-field settings-field-row">
        <div class="settings-toggle-label">
          <span class="settings-label">Spell Check</span>
          <span class="settings-sublabel">Underline misspelled words</span>
        </div>
        <button class="settings-toggle${spellcheck ? ' on' : ''}"
                id="settings-spellcheck" role="switch"
                aria-checked="${spellcheck}">
          <span class="settings-toggle-thumb"></span>
        </button>
      </div>

      <div class="settings-field settings-field-row">
        <div class="settings-toggle-label">
          <span class="settings-label">Paragraph Indent</span>
          <span class="settings-sublabel">Indent each paragraph's first line</span>
        </div>
        <button class="settings-toggle${indent ? ' on' : ''}"
                id="settings-indent" role="switch"
                aria-checked="${indent}">
          <span class="settings-toggle-thumb"></span>
        </button>
      </div>

      <div class="settings-field">
        <label class="settings-label" for="settings-spellcheck-lang">Spellcheck Language</label>
        <select id="settings-spellcheck-lang" class="settings-select">
          <option value=""${spellLang === '' ? ' selected' : ''}>Browser default</option>
          <option value="en-US"${spellLang === 'en-US' ? ' selected' : ''}>English (US)</option>
          <option value="en-GB"${spellLang === 'en-GB' ? ' selected' : ''}>English (UK)</option>
          <option value="fr"${spellLang === 'fr' ? ' selected' : ''}>French</option>
          <option value="de"${spellLang === 'de' ? ' selected' : ''}>German</option>
          <option value="es"${spellLang === 'es' ? ' selected' : ''}>Spanish</option>
          <option value="it"${spellLang === 'it' ? ' selected' : ''}>Italian</option>
          <option value="pt"${spellLang === 'pt' ? ' selected' : ''}>Portuguese</option>
        </select>
        <p class="settings-field-hint">Sets the <code>lang</code> attribute on the editor for browser spellcheck.</p>
      </div>

    </div>
  `;
}

function _bindEditorEvents(settings) {
  // Font family buttons
  _modal?.querySelectorAll('.settings-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const font = btn.dataset.font;
      _modal.querySelectorAll('.settings-group-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.font === font);
        b.setAttribute('aria-checked', b.dataset.font === font ? 'true' : 'false');
      });
      _saveSetting('font', font);
      applyEditorSettings(_project?.settings);
    });
  });

  // Font size slider
  const fsSlider = document.getElementById('settings-font-size');
  const fsVal    = document.getElementById('settings-font-size-val');
  fsSlider?.addEventListener('input', () => {
    const val = parseInt(fsSlider.value, 10);
    if (fsVal) fsVal.textContent = `${val}px`;
    _saveSetting('fontSize', val);
    applyEditorSettings(_project?.settings);
  });

  // Line height slider
  const lhSlider = document.getElementById('settings-line-height');
  const lhVal    = document.getElementById('settings-lh-val');
  lhSlider?.addEventListener('input', () => {
    const val = parseFloat(lhSlider.value);
    const rounded = Math.round(val * 10) / 10;
    if (lhVal) lhVal.textContent = String(rounded);
    _saveSetting('lineHeight', rounded);
    applyEditorSettings(_project?.settings);
  });

  // Spellcheck toggle
  document.getElementById('settings-spellcheck')?.addEventListener('click', e => {
    const btn = e.currentTarget;
    const on  = btn.classList.toggle('on');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    _saveSetting('spellcheck', on);
    applyEditorSettings(_project?.settings);
  });

  // Indent toggle
  document.getElementById('settings-indent')?.addEventListener('click', e => {
    const btn = e.currentTarget;
    const on  = btn.classList.toggle('on');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    _saveSetting('indent', on);
    applyEditorSettings(_project?.settings);
  });

  // Spellcheck language
  document.getElementById('settings-spellcheck-lang')?.addEventListener('change', e => {
    _saveSetting('spellLang', e.target.value);
    applyEditorSettings(_project?.settings);
  });
}

// ─── Export Section ───────────────────────────────────────────────────────────

function _buildExportSection(settings) {
  const author = settings.author ?? '';
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">Export</h3>

      <div class="settings-field">
        <label class="settings-label" for="settings-author">Author Name</label>
        <input type="text" id="settings-author" class="settings-text-input"
               placeholder="Your name…" value="${_esc(author)}">
        <p class="settings-field-hint">Used in exported document metadata.</p>
      </div>
    </div>
  `;
}

function _bindExportEvents(settings) {
  document.getElementById('settings-author')?.addEventListener('change', e => {
    _saveSetting('author', e.target.value.trim());
  });
}

// ─── Accent Colour ────────────────────────────────────────────────────────────

/**
 * Apply a custom accent hue to :root CSS variables.
 * @param {number} hue - HSL hue (0–360)
 */
export function applyAccentHue(hue) {
  if (hue == null) return;
  const root = document.documentElement;
  root.style.setProperty('--accent', `hsl(${hue}, 55%, 60%)`);
  root.style.setProperty('--accent-hover', `hsl(${hue}, 55%, 68%)`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _saveSetting(key, value) {
  if (!_project) return;
  if (!_project.settings) _project.settings = {};
  _project.settings[key] = value;
  saveProject(_project);
  _onSettingsChange?.(_project);
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
