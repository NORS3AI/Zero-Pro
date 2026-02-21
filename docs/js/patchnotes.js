// patchnotes.js — Patch notes modal

// ─── Patch Data ───────────────────────────────────────────────────────────────
// Ordered newest → oldest. Each entry maps to one logical release.

const PATCHES = [
  {
    version: 'v1.9',
    date: 'February 21, 2026',
    title: 'Phase 9 — UX Modernisation',
    changes: [
      { type: 'feat', text: 'Compile Wizard — one-click compile to KDP Novel, Print on Demand, Agent Submission, or Web Article presets' },
      { type: 'feat', text: 'WYSIWYG compile preview — see the formatted output in a live iframe before downloading' },
      { type: 'feat', text: 'Compile downloads in HTML, .txt, and .md — with title page and chapter separators' },
      { type: 'feat', text: 'Save custom compile presets by name for reuse' },
      { type: 'feat', text: 'Native Markdown mode — per-document toggle stores content as plain Markdown text' },
      { type: 'feat', text: 'Live split-pane preview: Markdown source on the left, rendered preview on the right' },
      { type: 'feat', text: 'Markdown ↔ Rich Text conversion when toggling modes — no content loss' },
      { type: 'feat', text: 'Settings search bar — type to filter settings sections by keyword' },
      { type: 'feat', text: 'Per-panel background colour pickers — override binder, editor, and inspector independently' },
      { type: 'feat', text: 'Font pairing — choose a separate UI font from the editor body font' },
    ],
  },
  {
    version: 'v1.8',
    date: 'February 21, 2026',
    title: 'File Menu Fix & Toolbar Cleanup',
    changes: [
      { type: 'fix',  text: 'File dropdown now opens correctly — toolbar scroll track overflow was clipping it' },
      { type: 'fix',  text: 'Removed "💾 Local" sync status pill from the toolbar' },
    ],
  },
  {
    version: 'v1.7',
    date: 'February 20, 2026',
    title: 'UX Polish, Templates & Data Protection',
    changes: [
      { type: 'feat', text: 'Toolbar infinite scroll completely rewritten — seamless loop with zero glitch at boundaries' },
      { type: 'feat', text: 'View swipe (Corkboard ↔ Editor ↔ Outline) now only triggers from the bottom 35% of the pane — no more accidental switches when using the Bold/Italic toolbar' },
      { type: 'feat', text: 'Shared room button now shows a loading state and "Room created!" toast with auto-selected invite link' },
      { type: 'feat', text: 'Join room — paste a full URL or just the token, both work' },
      { type: 'feat', text: 'Binder pin: sidebar can now be resized by dragging the right edge when pinned' },
      { type: 'feat', text: 'Binder pin width is saved per-session so it persists across views' },
      { type: 'feat', text: 'Character Sheet template — creates a pre-filled character doc in a Characters folder' },
      { type: 'feat', text: 'Location Sheet template — creates a pre-filled location doc in a Locations folder' },
      { type: 'feat', text: 'Ambience moved into Settings → Ambience tab with sound picker and volume slider' },
      { type: 'feat', text: 'Backup tab in Settings — save to device (File System Access API or download fallback)' },
      { type: 'feat', text: 'Auto-backup toggle — saves a .zeropro.json every hour during active writing sessions' },
      { type: 'feat', text: 'Google Drive integration — enter a Google Client ID, then back up your project with one click' },
      { type: 'feat', text: 'Ask AI button now uses a neural-network icon and is labelled "Ask AI" (supports Claude, ChatGPT, Gemini)' },
      { type: 'fix',  text: 'Binder pin CSS: sidebar now correctly stays visible at all screen sizes when pinned' },
      { type: 'fix',  text: 'Settings red X close button wired correctly; Escape key also closes settings' },
    ],
  },
  {
    version: 'v1.6',
    date: 'February 20, 2026 at 11:00 PM',
    title: 'Cloud Sync, Collaboration & PWA',
    changes: [
      { type: 'feat', text: 'Cloud sync via Supabase — sign in with a magic link, no password needed' },
      { type: 'feat', text: 'Sync status pill in the toolbar — shows Local / Synced / Syncing / Offline / Error' },
      { type: 'feat', text: 'Offline-first architecture — all writes queue in IndexedDB and flush on reconnect' },
      { type: 'feat', text: 'Service worker upgraded to v1.6 — caches all Phase 5–8 files including EPUB & media modules' },
      { type: 'feat', text: 'Background Sync API support — queued writes are sent even after the tab closes' },
      { type: 'feat', text: 'Real-time collaboration — create or join a shared room via a URL token' },
      { type: 'feat', text: 'Live presence avatars — see who else is in the room with colour-coded initials' },
      { type: 'feat', text: 'Typing presence indicator — "Aisha is writing…" shown in the status bar' },
      { type: 'feat', text: 'PWA install banner — prompt to add Zero Pro to the home screen on Android / iOS / Desktop' },
      { type: 'feat', text: 'Apple Touch icon and apple-mobile-web-app meta tags for iOS full-screen mode' },
      { type: 'feat', text: 'PWA manifest updated with shortcuts, categories, and maskable icon support' },
      { type: 'feat', text: 'Swipe left / right on the centre pane to cycle between Corkboard, Editor, and Outline' },
      { type: 'feat', text: 'Edge swipe from left / right side to open Binder or Inspector on mobile' },
      { type: 'feat', text: 'Swipe hint overlay shows the view name when switching via gesture' },
      { type: 'fix',  text: 'Auto-sync on document change (5 s debounce) when a Supabase backend is configured' },
      { type: 'fix',  text: 'Ctrl/Cmd+S now also pushes to cloud when sync is enabled' },
      { type: 'fix',  text: 'Offline banner appears automatically when the network is lost' },
    ],
  },
  {
    version: 'v1.5c',
    date: 'February 20, 2026 at 7:01 AM',
    title: 'Phase 7 — UI Polish & Nice-to-Haves',
    changes: [
      { type: 'feat', text: 'Find & Replace panel with full regex support (Ctrl+F / Ctrl+H)' },
      { type: 'feat', text: 'Full project search across all documents (Ctrl+Shift+F) with jump-to-result' },
      { type: 'feat', text: 'Revision history — take named point-in-time snapshots per document' },
      { type: 'feat', text: 'Snapshot diff view — side-by-side colour-coded comparison' },
      { type: 'feat', text: 'Format paint — copy inline styles from one selection and apply to another' },
      { type: 'feat', text: 'Colour-coded binder labels with a palette picker' },
      { type: 'feat', text: 'Duplicate document from context menu or binder header' },
      { type: 'feat', text: 'Multi-select documents with Shift+click for bulk label and bulk trash' },
      { type: 'feat', text: 'Corkboard card zoom slider and split corkboard (two folders side-by-side)' },
      { type: 'feat', text: 'Status dot on each corkboard card — Draft / Revised / Final' },
      { type: 'feat', text: 'Ambient sound player — rain, café, white noise, fireplace, wind (Web Audio API)' },
      { type: 'feat', text: 'Custom accent colour — HSL hue slider in Settings → Appearance' },
      { type: 'feat', text: 'Writing streak calendar — GitHub-style 6-month heatmap with streak stats' },
      { type: 'feat', text: 'Command palette (Ctrl/Cmd+K) — fuzzy search any action or document' },
    ],
  },
  {
    version: 'v1.5b',
    date: 'February 20, 2026 at 6:22 AM',
    title: 'Phase 6 — Image Import & Media',
    changes: [
      { type: 'feat', text: 'Drag-and-drop images into the editor (JPEG, PNG, WebP, GIF)' },
      { type: 'feat', text: 'Click-to-insert image via toolbar button or paste from clipboard' },
      { type: 'feat', text: 'Floating image toolbar — size presets (S/M/L/Full) and alignment controls' },
      { type: 'feat', text: 'Alt-text field on images for accessibility and EPUB metadata' },
      { type: 'feat', text: '5 MB size warning when base64 images make a document large' },
      { type: 'feat', text: 'Image binder item type — store standalone images with captions' },
      { type: 'feat', text: 'Image lightbox — click an image binder item to view full-size' },
      { type: 'feat', text: 'Drag image from binder into the editor to embed it in the manuscript' },
      { type: 'feat', text: 'Web clipping — paste a URL to save title + snippet as a research item' },
      { type: 'feat', text: 'Clip button in binder header for quick one-click web clipping' },
    ],
  },
  {
    version: 'v1.5a',
    date: 'February 20, 2026 at 4:43 AM',
    title: 'Phase 5 — Kindle & Publishing',
    changes: [
      { type: 'feat', text: 'EPUB 3 export with table of contents, chapter metadata, and EPUB 2 fallback for Kindle' },
      { type: 'feat', text: 'KDP Wizard — export EPUB or .docx with KDP-standard fonts, margins, and front matter' },
      { type: 'feat', text: 'IngramSpark Wizard — trim size / font picker, ISBN field, and POD checklist' },
      { type: 'feat', text: 'Agent Submission Formatter — 12 pt Times, double-spaced, 1" margins, running header' },
      { type: 'feat', text: 'Self-Publishing Checklist — 6-section interactive checklist covering editing to launch' },
      { type: 'feat', text: 'Genre Style Guides — tabbed quick-reference for Romance, Thriller, Literary, Non-Fiction' },
      { type: 'feat', text: 'Front & back matter templates — title, copyright, dedication, bio, "Also by" pages' },
      { type: 'feat', text: 'Expandable Trash — right-click to restore a document to its original folder' },
      { type: 'fix',  text: 'Trashing via right-click no longer shows a confirmation dialog' },
    ],
  },
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
