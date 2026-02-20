// patchnotes.js — Patch notes modal

// ─── Patch Data ───────────────────────────────────────────────────────────────
// Ordered newest → oldest. Each entry maps to one logical release.

const PATCHES = [
  {
    version: 'v1.5',
    date: 'February 20, 2026 at 2:52 PM',
    title: 'Mobile-Friendly Update',
    changes: [
      { type: 'feat', text: 'Full mobile-responsive layout with slide-in overlay drawers' },
      { type: 'feat', text: 'Viewport-fit support for iPhone notch & Dynamic Island' },
      { type: 'feat', text: 'Safe-area insets on toolbar, status bar, and all drawers' },
      { type: 'feat', text: 'Close (×) buttons inside binder and inspector drawers' },
      { type: 'feat', text: 'Formatting toolbar now scrolls horizontally on narrow screens' },
      { type: 'feat', text: 'Corkboard shows 2 columns on mobile, 1 column on very narrow screens' },
      { type: 'feat', text: 'Outline view scrolls horizontally to preserve all columns' },
      { type: 'feat', text: 'Dynamic viewport height (100dvh) — layout stays correct when browser chrome appears' },
      { type: 'fix',  text: 'Binder rename/delete buttons now always visible on touch devices (no hover required)' },
      { type: 'fix',  text: 'Toast notification repositioned above status bar with safe-area offset' },
      { type: 'fix',  text: 'Drawer scroll now contained — no longer propagates to the page behind it' },
    ],
  },
  {
    version: 'v1.4',
    date: 'February 19, 2026 at 9:50 PM',
    title: 'Polish & Bug Fixes',
    changes: [
      { type: 'fix',  text: 'Inspector panel is now fully scrollable when content overflows' },
      { type: 'fix',  text: 'Fixed spelling of "Analyze" in the Editing tab' },
    ],
  },
  {
    version: 'v1.3',
    date: 'February 19, 2026 at 9:24 PM',
    title: 'Settings, Themes & PWA',
    changes: [
      { type: 'feat', text: 'Settings modal with font family, font size, and line-height controls' },
      { type: 'feat', text: 'Four themes: Dark (default), Light, Sepia, and Pure Dark (OLED)' },
      { type: 'feat', text: 'Inspector: word count, character count, and reading-time stats' },
      { type: 'feat', text: 'Editing tab with prose-quality indicators (Clarity, Pacing, Dialogue, Description)' },
      { type: 'feat', text: 'PWA manifest — install Zero Pro as a standalone app on any device' },
    ],
  },
  {
    version: 'v1.2',
    date: 'February 19, 2026 at 7:53 PM',
    title: 'Productivity Tools',
    changes: [
      { type: 'feat', text: 'Find & Replace with regex support (Ctrl+F / Ctrl+H)' },
      { type: 'feat', text: 'Command Palette for fast keyboard-first navigation (Ctrl+K)' },
      { type: 'feat', text: 'Binder context menu: rename, delete, and set label colour via right-click' },
      { type: 'feat', text: 'Status badges on binder documents (Draft, In Progress, Done, etc.)' },
      { type: 'feat', text: 'Import .txt and .md files directly into the binder' },
      { type: 'feat', text: 'Import images into the binder and insert them into documents' },
      { type: 'feat', text: 'JSON project backup and full restore' },
      { type: 'feat', text: 'Service Worker — app works fully offline after first load' },
    ],
  },
  {
    version: 'v1.1',
    date: 'February 19, 2026 at 1:48 AM',
    title: 'AI Writing Assistant',
    changes: [
      { type: 'feat', text: 'Claude AI writing assistant sidebar with prompt templates' },
      { type: 'feat', text: 'Multi-provider AI support: Claude, ChatGPT, and Gemini' },
      { type: 'fix',  text: 'Pasted text now strips external formatting to match the document style' },
    ],
  },
  {
    version: 'v1.0',
    date: 'February 19, 2026 at 12:52 AM',
    title: 'Initial Release',
    changes: [
      { type: 'feat', text: 'Three-panel layout: Binder, Editor, and Inspector' },
      { type: 'feat', text: 'Binder with nested folders, drag-and-drop reordering, and trash' },
      { type: 'feat', text: 'Rich text editor with bold, italic, underline, strikethrough, and headings' },
      { type: 'feat', text: 'Autosave to localStorage — no account or internet required' },
      { type: 'feat', text: 'Corkboard view — visual scene cards with synopsis editing and colour labels' },
      { type: 'feat', text: 'Outline view — tabular overview with inline synopsis and status editing' },
      { type: 'feat', text: 'Inspector panel with document metadata, synopsis, status, and word targets' },
      { type: 'feat', text: 'Focus Mode for distraction-free writing' },
      { type: 'feat', text: 'Export to .txt, .md, .docx, and .doc' },
      { type: 'feat', text: 'Live word count and project-total word count in the status bar' },
      { type: 'docs', text: 'Full product specification, feature list, and 11-phase roadmap published' },
    ],
  },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

/** Build and inject the patch notes modal into the DOM (once). */
function _getOrCreateModal() {
  const existing = document.getElementById('patchnotes-modal-backdrop');
  if (existing) return existing;

  const backdrop = document.createElement('div');
  backdrop.id = 'patchnotes-modal-backdrop';
  backdrop.className = 'modal-backdrop patchnotes-backdrop hidden';
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-label', 'Patch Notes');

  backdrop.innerHTML = `
    <div class="modal patchnotes-modal" role="document">
      <div class="patchnotes-header">
        <div class="patchnotes-header-left">
          <span class="patchnotes-app-name">Zero Pro</span>
          <span class="patchnotes-title">Patch Notes</span>
        </div>
        <button class="btn btn-icon patchnotes-close" id="btn-patchnotes-close" aria-label="Close patch notes">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
      <div class="patchnotes-body">
        ${PATCHES.map((patch, i) => _renderPatch(patch, i === 0)).join('')}
      </div>
    </div>
  `;

  // Close on backdrop click
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closePatchNotes();
  });

  // Close button
  backdrop.querySelector('#btn-patchnotes-close').addEventListener('click', closePatchNotes);

  // Close on Escape
  document.addEventListener('keydown', _onKeyDown);

  document.body.appendChild(backdrop);
  return backdrop;
}

function _renderPatch(patch, isLatest) {
  const typeLabel = { feat: 'New', fix: 'Fix', docs: 'Docs' };
  const typeClass = { feat: 'pn-tag--feat', fix: 'pn-tag--fix', docs: 'pn-tag--docs' };

  const items = patch.changes
    .map(c => `
      <li class="pn-change">
        <span class="pn-tag ${typeClass[c.type] ?? ''}">${typeLabel[c.type] ?? c.type}</span>
        <span class="pn-change-text">${c.text}</span>
      </li>`)
    .join('');

  return `
    <div class="pn-entry${isLatest ? ' pn-entry--latest' : ''}">
      <div class="pn-entry-header">
        <div class="pn-version-row">
          <span class="pn-version">${patch.version}</span>
          ${isLatest ? '<span class="pn-latest-badge">Latest</span>' : ''}
          <span class="pn-title">${patch.title}</span>
        </div>
        <time class="pn-date">${patch.date}</time>
      </div>
      <ul class="pn-changes">${items}</ul>
    </div>`;
}

function _onKeyDown(e) {
  if (e.key === 'Escape') closePatchNotes();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Open the patch notes modal. */
export function openPatchNotes() {
  const backdrop = _getOrCreateModal();
  backdrop.classList.remove('hidden');
  document.getElementById('btn-patchnotes-close')?.focus();
}

/** Close the patch notes modal. */
export function closePatchNotes() {
  document.getElementById('patchnotes-modal-backdrop')?.classList.add('hidden');
  document.removeEventListener('keydown', _onKeyDown);
}
