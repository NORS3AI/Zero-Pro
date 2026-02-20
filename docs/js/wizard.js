// wizard.js — First-run welcome wizard (Phase 8)
// Shows once on first visit. Introduces Zero Pro, offers Import or New Project.

const STORAGE_KEY = 'zp_wizard_shown';

// Feature list shown in the expandable tab
const FEATURES = [
  { icon: '📝', title: 'Rich Text Editor',        desc: 'Bold, italic, headings, focus mode, typewriter mode, and autosave.' },
  { icon: '📂', title: 'Binder',                  desc: 'Organize chapters and scenes in a nested tree with drag-and-drop.' },
  { icon: '🃏', title: 'Corkboard',                desc: 'Visual scene cards with synopsis editing, colour labels, and zoom.' },
  { icon: '📋', title: 'Outline View',             desc: 'Table layout with inline synopsis editing, status, and word counts.' },
  { icon: '🔍', title: 'Inspector',                desc: 'Document metadata, synopsis, targets, and prose-quality scores.' },
  { icon: '🤖', title: 'AI Writing Assistant',     desc: 'Powered by Claude, ChatGPT, or Gemini with your own API key.' },
  { icon: '📚', title: 'Publishing & EPUB',        desc: 'KDP Wizard, IngramSpark Wizard, agent submission formatter, and EPUB 3 export.' },
  { icon: '🖼️', title: 'Image & Media',            desc: 'Drag images into documents, manage a research library in the binder.' },
  { icon: '🎵', title: 'Audio Library',            desc: 'Import music, SFX, and ambience files with custom labels.' },
  { icon: '🔊', title: 'Ambient Sounds',           desc: 'Procedural rain, café, white noise, fireplace, and wind via Web Audio API.' },
  { icon: '📸', title: 'Snapshots',                desc: 'Named point-in-time saves with side-by-side diff viewer.' },
  { icon: '🔥', title: 'Writing Streak',           desc: 'GitHub-style heatmap calendar tracking your daily word output.' },
  { icon: '☁️', title: 'Cloud Sync',               desc: 'Optional Supabase backend — sync across devices with a magic link.' },
  { icon: '👥', title: 'Collaboration',            desc: 'Share a project room with co-authors and see live typing presence.' },
  { icon: '📱', title: 'PWA / Offline',            desc: 'Install to home screen. Works fully offline after first load.' },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Show the wizard if it hasn't been dismissed before.
 * @param {{ onImport: () => void, onNewProject: () => void }} callbacks
 */
export function maybeShowWizard({ onImport, onNewProject }) {
  if (localStorage.getItem(STORAGE_KEY)) return;
  _showWizard({ onImport, onNewProject });
}

/** Force-show the wizard (from Help menu etc.) */
export function showWizard({ onImport, onNewProject }) {
  _showWizard({ onImport, onNewProject });
}

// ─── Wizard modal ─────────────────────────────────────────────────────────────

function _showWizard({ onImport, onNewProject }) {
  const existing = document.getElementById('wizard-backdrop');
  if (existing) { existing.classList.remove('hidden'); return; }

  const now   = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const backdrop = document.createElement('div');
  backdrop.id        = 'wizard-backdrop';
  backdrop.className = 'wizard-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', 'Welcome to Zero Pro');

  backdrop.innerHTML = `
    <div class="wizard-modal" role="document">

      <!-- Header -->
      <div class="wizard-header">
        <div class="wizard-logo">Z</div>
        <h1 class="wizard-title">Zero Pro</h1>
        <p class="wizard-byline">by <strong>NORS3AI</strong></p>
        <p class="wizard-date">${dateStr}</p>
      </div>

      <!-- Intro -->
      <div class="wizard-intro">
        <p>
          Zero Pro is a <strong>browser-based writing suite</strong> built for novelists,
          screenwriters, and non-fiction authors. Write, organise, and publish —
          no installation, no account, no limits.
        </p>
        <p class="wizard-audience">
          Perfect for writers who want the power of Scrivener with the simplicity of
          opening a browser tab.
        </p>
      </div>

      <!-- Feature tab (expandable) -->
      <details class="wizard-features-details" id="wizard-features-details">
        <summary class="wizard-features-summary">
          <span class="wizard-features-arrow">▶</span>
          View all features
        </summary>
        <div class="wizard-features-grid">
          ${FEATURES.map(f => `
            <div class="wizard-feature-card">
              <span class="wizard-feature-icon">${f.icon}</span>
              <div>
                <div class="wizard-feature-title">${f.title}</div>
                <div class="wizard-feature-desc">${f.desc}</div>
              </div>
            </div>`).join('')}
        </div>
      </details>

      <!-- Action buttons -->
      <div class="wizard-actions">
        <button class="wizard-btn wizard-btn--import" id="btn-wizard-import">
          <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg>
          Import File
          <span class="wizard-btn-hint">.txt · .doc · .docx</span>
        </button>
        <button class="wizard-btn wizard-btn--new" id="btn-wizard-new">
          <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z"/></svg>
          New Project
          <span class="wizard-btn-hint">Start fresh</span>
        </button>
      </div>

      <!-- Close -->
      <div class="wizard-close-row">
        <button class="wizard-close-btn" id="btn-wizard-close">Close</button>
      </div>

    </div>
  `;

  document.body.appendChild(backdrop);

  // Arrow rotation for details
  const details = document.getElementById('wizard-features-details');
  details?.addEventListener('toggle', () => {
    const arrow = details.querySelector('.wizard-features-arrow');
    if (arrow) arrow.textContent = details.open ? '▼' : '▶';
  });

  // Import button
  document.getElementById('btn-wizard-import')?.addEventListener('click', () => {
    _dismiss();
    onImport?.();
  });

  // New project button
  document.getElementById('btn-wizard-new')?.addEventListener('click', () => {
    _dismiss();
    onNewProject?.();
  });

  // Close button
  document.getElementById('btn-wizard-close')?.addEventListener('click', _dismiss);

  // Escape key
  const _onKey = e => { if (e.key === 'Escape') _dismiss(); };
  document.addEventListener('keydown', _onKey);
  backdrop.dataset.keyHandler = 'true';
}

function _dismiss() {
  localStorage.setItem(STORAGE_KEY, '1');
  document.getElementById('wizard-backdrop')?.remove();
}
