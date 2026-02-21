// settings.js — Settings modal: themes, typography, editor preferences
// Phase 9: UX Modernisation

import { saveProject } from './storage.js';
import { GOOGLE_CLIENT_ID } from './config.js';
import {
  playAmbientSound, stopAmbientSound,
  getActiveSound, getSoundVolume, setSoundVolume, getSoundList,
} from './ambient.js';

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
  { id: 'appearance', label: 'Appearance', icon: '◑', keywords: 'theme color colour dark light sepia oled accent binder editor inspector panel background font ui pairing' },
  { id: 'editor',     label: 'Editor',     icon: '✎', keywords: 'font size spellcheck indent line height language typeface mono serif' },
  { id: 'ambience',   label: 'Ambience',   icon: '🎵', keywords: 'sound ambient rain cafe noise fireplace wind volume' },
  { id: 'backup',     label: 'Backup',     icon: '☁', keywords: 'backup save device google drive auto restore' },
  { id: 'export',     label: 'Export',     icon: '↓', keywords: 'export settings import preferences json transfer' },
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

/**
 * Apply per-panel background colour overrides to CSS variables.
 * @param {Object} settings
 */
export function applyPanelColors(settings) {
  const root = document.documentElement;
  const panels = [
    { key: 'binderBg',    prop: '--binder-bg'    },
    { key: 'editorBg',    prop: '--editor-bg'    },
    { key: 'inspectorBg', prop: '--inspector-bg' },
  ];
  panels.forEach(({ key, prop }) => {
    if (settings?.[key]) root.style.setProperty(prop, settings[key]);
    else                 root.style.removeProperty(prop);
  });
}

/**
 * Apply the UI chrome font family.
 * @param {'system'|'georgia'|'mono'} uiFont
 */
export function applyUiFont(uiFont) {
  const root = document.documentElement;
  if (uiFont === 'georgia') {
    root.style.setProperty('--font-ui', "Georgia, 'Times New Roman', serif");
  } else if (uiFont === 'mono') {
    root.style.setProperty('--font-ui', "'Courier New', Courier, monospace");
  } else {
    root.style.removeProperty('--font-ui'); // revert to CSS default
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
        <div class="settings-search-wrap">
          <input type="search" class="settings-search-input" id="settings-search"
                 placeholder="Search settings…" aria-label="Search settings" autocomplete="off">
        </div>
        ${SECTIONS.map(s => `
          <button class="settings-nav-item" data-section="${s.id}"
                  data-keywords="${s.keywords || ''}" aria-pressed="false">
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

  // Settings search — filter nav items by keyword
  wrap.querySelector('#settings-search')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    wrap.querySelectorAll('.settings-nav-item').forEach(item => {
      const label    = (item.querySelector('.settings-nav-label')?.textContent ?? '').toLowerCase();
      const keywords = (item.dataset.keywords ?? '').toLowerCase();
      const visible  = !q || label.includes(q) || keywords.includes(q);
      item.classList.toggle('hidden', !visible);
    });
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
  } else if (_activeSection === 'ambience') {
    body.innerHTML = _buildAmbienceSection();
    _bindAmbienceEvents();
  } else if (_activeSection === 'backup') {
    body.innerHTML = _buildBackupSection(settings);
    _bindBackupEvents();
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

      <div class="settings-field">
        <label class="settings-label">Panel Background Colours</label>
        <p class="settings-field-hint">Override the background for each panel independently. Leave blank to follow the theme.</p>
        <div class="panel-color-grid">
          ${[
            { key: 'binderBg',    label: 'Binder',    id: 'settings-binder-bg'    },
            { key: 'editorBg',    label: 'Editor',    id: 'settings-editor-bg'    },
            { key: 'inspectorBg', label: 'Inspector', id: 'settings-inspector-bg' },
          ].map(p => `
            <div class="panel-color-item">
              <span class="panel-color-label">${p.label}</span>
              <div class="panel-color-swatch" title="Click to pick colour">
                <div class="panel-color-preview" id="${p.id}-preview"
                     style="background:${settings[p.key] || 'var(--bg)'}"></div>
                <input type="color" id="${p.id}"
                       value="${settings[p.key] || '#1a1a1c'}"
                       aria-label="${p.label} background colour">
              </div>
              <button class="panel-color-reset" data-panel-key="${p.key}">Reset</button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="settings-field">
        <label class="settings-label">Font Pairing</label>
        <p class="settings-field-hint">Choose separate fonts for the UI chrome and the editor body text.</p>
        <div class="font-pair-grid">
          <div class="font-pair-item">
            <span class="font-pair-label">UI Font</span>
            <select id="settings-ui-font" class="settings-select">
              <option value="system" ${(settings.uiFont ?? 'system') === 'system'  ? 'selected' : ''}>System default</option>
              <option value="georgia" ${settings.uiFont === 'georgia'  ? 'selected' : ''}>Georgia (serif)</option>
              <option value="mono"    ${settings.uiFont === 'mono'     ? 'selected' : ''}>Courier (mono)</option>
            </select>
          </div>
          <div class="font-pair-item">
            <span class="font-pair-label">Editor Font</span>
            <span class="settings-sublabel" style="font-size:11px;color:var(--text-muted)">Set in the Editor tab</span>
          </div>
        </div>
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

  // Per-panel background colour pickers
  [
    { key: 'binderBg',    id: 'settings-binder-bg'    },
    { key: 'editorBg',    id: 'settings-editor-bg'    },
    { key: 'inspectorBg', id: 'settings-inspector-bg' },
  ].forEach(({ key, id }) => {
    document.getElementById(id)?.addEventListener('input', e => {
      const color = e.target.value;
      const preview = document.getElementById(`${id}-preview`);
      if (preview) preview.style.background = color;
      _saveSetting(key, color);
      applyPanelColors(_project?.settings ?? {});
    });
  });

  // Per-panel reset buttons
  _modal?.querySelectorAll('.panel-color-reset').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.panelKey;
      if (!key) return;
      _saveSetting(key, null);
      applyPanelColors(_project?.settings ?? {});
      // Re-render to refresh the colour inputs
      _populateModal();
    });
  });

  // UI Font pairing selector
  document.getElementById('settings-ui-font')?.addEventListener('change', e => {
    const val = e.target.value;
    _saveSetting('uiFont', val);
    applyUiFont(val);
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

// ─── Ambience Section ─────────────────────────────────────────────────────────

function _buildAmbienceSection() {
  const sounds  = getSoundList();
  const active  = getActiveSound();
  const vol     = Math.round(getSoundVolume() * 100);

  const btnHtml = sounds.map(s => `
    <button class="ambient-settings-btn${active === s.id ? ' active' : ''}"
            data-sound="${s.id}"
            aria-pressed="${active === s.id}"
            title="${s.label}">
      <span class="ambient-settings-icon">${s.icon}</span>
      <span>${s.label}</span>
    </button>`).join('');

  return `
    <div class="settings-section">
      <h3 class="settings-section-title">Ambient Sounds</h3>
      <p class="settings-field-hint" style="margin-bottom:16px">
        Procedurally generated sounds — no downloads needed. Pick one to play while you write.
      </p>

      <div class="settings-field">
        <label class="settings-label">Sound</label>
        <div class="ambient-settings-grid">${btnHtml}</div>
      </div>

      <div class="settings-field">
        <label class="settings-label" for="settings-ambient-vol">
          Volume — <span id="settings-ambient-vol-val">${vol}%</span>
        </label>
        <input type="range" id="settings-ambient-vol" class="settings-range"
               min="0" max="100" step="1" value="${vol}">
      </div>

      ${active ? `<div class="settings-field">
        <button class="btn-secondary" id="settings-ambient-stop" style="width:100%">
          ⏹ Stop "${sounds.find(s => s.id === active)?.label ?? active}"
        </button>
      </div>` : ''}
    </div>
  `;
}

function _bindAmbienceEvents() {
  _modal?.querySelectorAll('.ambient-settings-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playAmbientSound(btn.dataset.sound);
      // Re-render the section so active state updates
      const body = document.getElementById('settings-body');
      if (body) { body.innerHTML = _buildAmbienceSection(); _bindAmbienceEvents(); }
    });
  });

  const volSlider = document.getElementById('settings-ambient-vol');
  const volVal    = document.getElementById('settings-ambient-vol-val');
  volSlider?.addEventListener('input', () => {
    const v = parseInt(volSlider.value, 10);
    if (volVal) volVal.textContent = `${v}%`;
    setSoundVolume(v / 100);
  });

  document.getElementById('settings-ambient-stop')?.addEventListener('click', () => {
    stopAmbientSound();
    const body = document.getElementById('settings-body');
    if (body) { body.innerHTML = _buildAmbienceSection(); _bindAmbienceEvents(); }
  });
}

// ─── Backup Section ───────────────────────────────────────────────────────────

const _GDRIVE_LOGO = `
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style="flex-shrink:0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>`;

function _buildBackupSection(settings) {
  const lastBackup  = localStorage.getItem('zp_last_backup');
  const lastBackupStr = lastBackup
    ? `Last backup: ${new Date(parseInt(lastBackup, 10)).toLocaleString()}`
    : 'No backup recorded yet.';
  const lastDriveBackup    = localStorage.getItem('zp_last_drive_backup');
  const lastDriveBackupStr = lastDriveBackup
    ? `Last Drive backup: ${new Date(parseInt(lastDriveBackup, 10)).toLocaleString()}`
    : '';

  // Use config.js value OR a developer-supplied ID stored in localStorage
  const storedId = localStorage.getItem('zp_gdrive_client_id') || '';
  const clientIdAvailable = !!(GOOGLE_CLIENT_ID || storedId);

  // When no client ID is available anywhere, show a first-time setup section
  const setupSection = !clientIdAvailable ? `
    <details id="gdrive-setup" style="margin-top:10px">
      <summary style="font-size:11px;color:var(--accent);cursor:pointer;user-select:none">
        ▶ First-time setup — connect your Google account
      </summary>
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
        <p class="settings-field-hint">
          To enable Google Drive backups, a Google OAuth Client ID is required.<br>
          <strong>One-time setup (takes ~2 min):</strong><br>
          1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color:var(--accent)">Google Cloud Console → Credentials</a><br>
          2. Create project → OAuth Client ID → Web application<br>
          3. Add <code>${location.origin}</code> as an Authorised JavaScript Origin<br>
          4. Paste the Client ID below and click Save
        </p>
        <div style="display:flex;gap:8px">
          <input type="text" id="settings-gdrive-client-id" class="settings-text-input"
                 placeholder="123456789-abc….apps.googleusercontent.com"
                 style="flex:1;font-size:11px">
          <button class="btn-primary" id="settings-gdrive-save-id">Save</button>
        </div>
      </div>
    </details>` : '';

  return `
    <div class="settings-section">
      <h3 class="settings-section-title">Backup &amp; Data Protection</h3>

      <!-- Device backup -->
      <div class="settings-field">
        <label class="settings-label">Save to Device</label>
        <p class="settings-field-hint">
          Saves your full project as a <code>.zeropro.json</code> file.
          On iOS, use the Share Sheet to save to Files. On Android &amp; desktop, you can choose where to save.
        </p>
        <button class="btn-primary" id="settings-backup-device" style="margin-top:8px;width:100%">
          💾 Save backup to device…
        </button>
        <p class="settings-field-hint" style="margin-top:6px">${_esc(lastBackupStr)}</p>
      </div>

      <div class="settings-field" style="border-top:1px solid var(--border);padding-top:18px">
        <label class="settings-label">Auto-protect against cache wipe</label>
        <p class="settings-field-hint">
          Keeps a copy of your project in <strong>sessionStorage</strong> and exports a backup
          file automatically every hour of writing — so a browser cache clear never loses your work.
        </p>
        <div class="settings-field-row" style="margin-top:8px">
          <div class="settings-toggle-label">
            <span class="settings-label">Auto-backup every hour</span>
            <span class="settings-sublabel">Saves a .zeropro.json to your downloads folder</span>
          </div>
          <button class="settings-toggle${settings.autoBackup ? ' on' : ''}"
                  id="settings-auto-backup" role="switch"
                  aria-checked="${settings.autoBackup ? 'true' : 'false'}">
            <span class="settings-toggle-thumb"></span>
          </button>
        </div>
      </div>

      <!-- Google Drive -->
      <div class="settings-field" style="border-top:1px solid var(--border);padding-top:18px">
        <label class="settings-label">Google Drive</label>
        <p class="settings-field-hint">Sign in with your Google account to save a backup directly to your Drive.</p>
        <button class="btn-primary" id="settings-gdrive-signin"
                style="margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px">
          ${_GDRIVE_LOGO}
          Sign in with Google
        </button>
        ${lastDriveBackupStr ? `<p class="settings-field-hint" style="margin-top:6px">${_esc(lastDriveBackupStr)}</p>` : ''}
        ${setupSection}
      </div>
    </div>
  `;
}

function _bindBackupEvents() {
  // Device backup button — uses File System Access API when available
  document.getElementById('settings-backup-device')?.addEventListener('click', async () => {
    if (!_project) return;
    const json     = JSON.stringify(_project, null, 2);
    const filename = (_project.title || 'project').replace(/[^a-z0-9\-_ ]/gi, '_') + '.zeropro.json';
    const blob     = new Blob([json], { type: 'application/json' });

    if ('showSaveFilePicker' in window) {
      try {
        const fh = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Zero Pro backup', accept: { 'application/json': ['.zeropro.json', '.json'] } }],
        });
        const writable = await fh.createWritable();
        await writable.write(blob);
        await writable.close();
        _recordBackup();
        _refreshBackupSection();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user cancelled
        // Fall through to download link
      }
    }

    // Fallback: browser download (iOS Files, old browsers)
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    _recordBackup();
    _refreshBackupSection();
  });

  // Auto-backup toggle
  document.getElementById('settings-auto-backup')?.addEventListener('click', e => {
    const btn = e.currentTarget;
    const on  = btn.classList.toggle('on');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    _saveSetting('autoBackup', on);
    if (on) _scheduleAutoBackup(); else _clearAutoBackup();
  });

  // Google Drive — sign in & upload
  document.getElementById('settings-gdrive-signin')?.addEventListener('click', _uploadToGoogleDrive);

  // First-time setup: save a developer-supplied Client ID to localStorage
  document.getElementById('settings-gdrive-save-id')?.addEventListener('click', () => {
    const id = document.getElementById('settings-gdrive-client-id')?.value.trim();
    if (!id) return;
    localStorage.setItem('zp_gdrive_client_id', id);
    _refreshBackupSection(); // re-render to show sign-in button active
  });
}

function _recordBackup() {
  localStorage.setItem('zp_last_backup', Date.now().toString());
}

function _refreshBackupSection() {
  const body = document.getElementById('settings-body');
  if (body && _activeSection === 'backup') {
    body.innerHTML = _buildBackupSection(_project?.settings ?? {});
    _bindBackupEvents();
  }
}

// Auto-backup scheduling
let _autoBackupTimer = null;
function _scheduleAutoBackup() {
  _clearAutoBackup();
  _autoBackupTimer = setInterval(() => {
    if (!_project) return;
    const json     = JSON.stringify(_project, null, 2);
    const filename = (_project.title || 'project').replace(/[^a-z0-9\-_ ]/gi, '_') + '-auto.zeropro.json';
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const a        = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    _recordBackup();
  }, 60 * 60 * 1000); // every hour
}
function _clearAutoBackup() {
  clearInterval(_autoBackupTimer);
  _autoBackupTimer = null;
}

// Google Drive OAuth 2.0 implicit flow
// Client ID comes from config.js (developer-configured) or localStorage (first-time setup).
async function _uploadToGoogleDrive() {
  // Prefer config.js value; fall back to developer-entered ID stored in localStorage
  const clientId = GOOGLE_CLIENT_ID || localStorage.getItem('zp_gdrive_client_id') || '';
  if (!clientId) {
    // Toggle the setup section open if it exists
    const setup = document.getElementById('gdrive-setup');
    if (setup) { setup.open = true; setup.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    return;
  }
  if (!_project) return;

  const scope       = 'https://www.googleapis.com/auth/drive.file';
  const redirectUri = location.origin + location.pathname;
  const authUrl     = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(scope)}`;

  // Open sign-in popup
  const popup = window.open(authUrl, 'gdrive-auth', 'width=520,height=620');
  if (!popup) { alert('Please allow popups for this site to sign in with Google.'); return; }

  // Poll for the access token in the hash
  const token = await new Promise(resolve => {
    const timer = setInterval(() => {
      try {
        const hash = popup.location.hash;
        if (hash && hash.includes('access_token=')) {
          clearInterval(timer);
          popup.close();
          const params = new URLSearchParams(hash.slice(1));
          resolve(params.get('access_token') || '');
        }
        if (popup.closed) { clearInterval(timer); resolve(''); }
      } catch { /* cross-origin — still loading, ignore */ }
    }, 300);
  });

  if (!token) { alert('Google sign-in was cancelled.'); return; }

  // Upload via multipart to Drive API
  const filename = (_project.title || 'project').replace(/[^a-z0-9\-_ ]/gi, '_') + '.zeropro.json';
  const fileBody = JSON.stringify(_project, null, 2);
  const meta     = JSON.stringify({ name: filename, mimeType: 'application/json' });

  const form = new FormData();
  form.append('metadata', new Blob([meta], { type: 'application/json' }));
  form.append('file',     new Blob([fileBody], { type: 'application/json' }));

  try {
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
    );
    if (res.ok) {
      localStorage.setItem('zp_last_drive_backup', Date.now().toString());
      _recordBackup();
      _refreshBackupSection();
      alert(`✅ Backup saved to Google Drive as "${filename}"`);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Google Drive upload failed: ${err.error?.message || res.statusText}`);
    }
  } catch (e) {
    alert(`Upload error: ${e.message}`);
  }
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
