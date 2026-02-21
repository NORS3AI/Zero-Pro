# Zero Pro — Claude Code Guide

## Project Overview

Zero Pro is a browser-based writing application hosted on GitHub Pages. It is inspired by Scrivener and designed to give writers a powerful, distraction-free environment without requiring any software installation. Everything runs in the browser; no backend, no accounts, no setup.

The core philosophy: a writer should be able to open a URL and immediately start writing, organizing, and revising their work.

**Current version: v1.13** — Phases 1–13 complete.

## Tech Stack

- **Runtime**: Vanilla HTML, CSS, and JavaScript (no build step required for GitHub Pages compatibility)
- **Storage**: `localStorage` + IndexedDB offline queue + optional Supabase cloud sync
- **Hosting**: GitHub Pages (static files only — no server-side code)
- **Export**: Client-side generation of `.txt`, `.md`, `.docx`, `.doc`, `.epub` via browser APIs and CDN libraries
- **No framework lock-in**: All components are plain ES modules

### CDN Libraries (loaded in `index.html`)

| Library | Purpose |
|---|---|
| Sortable.js | Drag-and-drop for binder, corkboard, and timeline |
| html-docx-js | HTML → .docx export |
| JSZip | EPUB 3 packaging |
| DOMPurify | Sanitise pasted HTML |
| mammoth.js | .docx / .doc → HTML import |
| Marked.js | Markdown parsing for Markdown mode preview |
| PDF.js v3 | In-browser PDF rendering and annotation |
| Yjs (via CDN) | CRDT real-time collaboration |

No React, no Vue, no build pipeline.

## Project Structure

```
Zero-Pro/
├── CLAUDE.md           # This file — dev guide and session playbook
├── README.md           # Project overview, feature list, roadmap summary
├── features.md         # Full feature specification with priority/phase/complexity
├── roadmap.md          # Detailed milestone checklists per phase
└── docs/               # GitHub Pages root (Settings → Pages → /docs)
    ├── index.html      # App entry point; loads all CSS and the app.js module
    ├── manifest.json   # PWA manifest (Phase 8)
    ├── sw.js           # Service worker — caches assets for offline use (Phase 8)
    ├── css/
    │   ├── main.css        # Global styles, CSS custom properties, themes
    │   ├── editor.css      # Editor pane and formatting toolbar
    │   ├── sidebar.css     # Binder / left sidebar
    │   ├── corkboard.css   # Corkboard index-card grid
    │   ├── outline.css     # Outline table view
    │   ├── inspector.css   # Inspector panel (right sidebar)
    │   ├── ai.css          # AI assistant panel
    │   ├── settings.css    # Settings modal
    │   ├── publish.css     # Publishing wizards (Phase 5)
    │   ├── phase7.css      # Snapshots, streaks, ambient, compile (Phase 7)
    │   ├── phase8.css      # Sync, collab, PWA UI (Phase 8)
    │   ├── phase9.css      # Command palette, compile wizard, Markdown mode (Phase 9)
    │   ├── phase10.css     # Timeline, PDF viewer, snapshot browser (Phase 10)
    │   ├── phase11.css     # Stats, keybindings, webhooks, accessibility (Phase 11)
    │   ├── phase12.css     # Characters, wiki links, plot templates, project wizard (Phase 12)
    │   ├── phase13.css     # Sprint HUD, reading overlay, smart-type toast, split editor (Phase 13)
    │   ├── wizard.css      # Onboarding wizard (Phase 9)
    │   └── responsive.css  # Mobile / tablet breakpoints
    ├── js/
    │   ├── app.js              # App bootstrap, state, view switching, toolbar wiring
    │   ├── storage.js          # localStorage CRUD: project, documents, settings
    │   ├── editor.js           # Rich text contenteditable editor, autosave, focus mode
    │   ├── binder.js           # Document tree: add/rename/delete/reorder, context menu
    │   ├── corkboard.js        # Corkboard card grid with Sortable.js
    │   ├── outline.js          # Outline table with inline editing
    │   ├── inspector.js        # Inspector panel: metadata, synopsis, notes, readability
    │   ├── ui.js               # Shared helpers: showToast, showPrompt, modals
    │   ├── export.js           # Export: txt, md, docx, doc, HTML, JSON backup
    │   ├── import.js           # Import: txt, md, docx (mammoth.js), JSON, Google Docs
    │   ├── compile.js          # Compile wizard: step-by-step UI, presets, WYSIWYG preview
    │   ├── ai.js               # AI assistant panel: Claude/ChatGPT/Gemini integration
    │   ├── ai-analysis.js      # Flesch-Kincaid readability + Claude tone analysis
    │   ├── find-replace.js     # Find & replace: document and project-wide search
    │   ├── snapshots.js        # Per-document snapshot list, restore, diff
    │   ├── snapshot-browser.js # Global snapshot search + paragraph-level restore (Phase 10)
    │   ├── markdown-mode.js    # Per-document Markdown toggle + live preview (Phase 9)
    │   ├── command-palette.js  # Ctrl+K fuzzy search palette
    │   ├── settings.js         # Settings modal: sections, search, apply, accessibility
    │   ├── publish.js          # KDP / IngramSpark / Agent wizards, EPUB export
    │   ├── media.js            # Image import, base64 storage, reference panel
    │   ├── timeline.js         # Visual timeline view: story/chrono, POV lanes (Phase 10)
    │   ├── pdf-viewer.js       # PDF.js viewer + highlight annotations (Phase 10)
    │   ├── ambient.js          # Ambient sound player (rain, café, etc.)
    │   ├── streak.js           # Writing streak calendar, daily word tracking
    │   ├── sync.js             # Supabase cloud sync, offline queue (Phase 8)
    │   ├── collab.js           # Yjs CRDT real-time collaboration (Phase 8)
    │   ├── touch.js            # Touch gesture navigation for mobile (Phase 9)
    │   ├── wizard.js           # First-run onboarding wizard (Phase 9)
    │   ├── toolbar-loop.js     # Toolbar scroll loop for narrow viewports
    │   ├── stats.js            # Writing statistics dashboard: SVG charts, CSV export (Phase 11)
    │   ├── keybindings.js      # Global keybinding registry + rebind panel (Phase 11)
    │   ├── webhooks.js         # Outbound webhooks + batch rename (Phase 11)
    │   ├── prompt-library.js   # Personal Claude prompt template library (Phase 11)
    │   ├── characters.js       # Character database: two-pane modal, project.characters[] (Phase 12)
    │   ├── wiki-links.js       # [[wiki-link]] autocomplete + click navigation (Phase 12)
    │   ├── plot-templates.js   # Plot structure templates (Three-Act, Hero's Journey…) (Phase 12)
    │   ├── project-templates.js# New Project from Template wizard (Phase 12)
    │   ├── sprint.js           # Writing Sprint Timer: ring HUD, presets, WPM (Phase 13)
    │   ├── reading-mode.js     # Reading Mode: full-screen doc/manuscript overlay (Phase 13)
    │   ├── smart-type.js       # Smart Typography: curly quotes, em-dashes, ellipses (Phase 13)
    │   ├── split-editor.js     # Split Editor: side-by-side CSS Grid reference pane (Phase 13)
    │   ├── config.js           # App-level constants (API endpoints, storage keys)
    │   ├── strings.js          # User-facing strings for future i18n (if present)
    │   └── offline-queue.js    # IndexedDB offline write queue (Phase 8)
    ├── assets/
    │   └── icons/              # SVG icons and PWA icon set (192×192, 512×512)
    └── libs/                   # (Legacy) Vendored fallback copies — prefer CDN
```

## Development Guidelines

### Running Locally

```bash
# Python
python3 -m http.server 8080 --directory docs

# Node
npx serve docs
```

Open `http://localhost:8080`. Do **not** open `index.html` via `file://` — the File System Access API and Service Worker require a secure context (`http://localhost` or `https://`).

### Code Conventions

- Use ES modules (`type="module"` on the `<script>` tag). Avoid CommonJS.
- Prefer `const` and `let`; never `var`.
- Keep functions small and single-purpose. Aim for files under 400 lines; split when they grow.
- CSS variables live in `:root` in `main.css`. Do not hardcode colours or spacing values.
- All user-facing strings should go in `js/strings.js` to make future i18n easier.
- No TypeScript is required, but JSDoc comments on exported functions are welcome.
- **Always test for unescaped apostrophes in string literals.** Use double-quoted strings or template literals when the content contains apostrophes (e.g., `"hero's journey"` not `'hero\'s journey'`).

### Branching

- `main` — stable, always deployable to GitHub Pages
- `dev` — integration branch for in-progress work
- Feature branches: `feature/<short-description>`
- Bugfix branches: `fix/<short-description>`
- Claude Code branches: `claude/<description>-<session-id>`

### Commits

Use the conventional commits format:

```
feat: add word count to status bar
fix: escape apostrophes in plot-templates.js strings
docs: update roadmap with Phase 13 milestones
refactor: extract storage abstraction into storage.js
```

### Deploying to GitHub Pages

GitHub Pages serves from the `/docs` folder on the `main` branch. All app files (`index.html`, `css/`, `js/`, `assets/`) must live inside `/docs`. Merging to `main` deploys automatically.

To configure: **Settings → Pages → Source: Deploy from a branch → Branch: `main` → Folder: `/docs`**

## Key Constraints

- **No server**: all logic must run client-side. Do not introduce Node.js, PHP, or any server dependency.
- **No mandatory accounts**: users must be able to use the app without signing in. Cloud sync is an optional feature.
- **Offline-first**: the app must be fully functional without internet after the first page load. The service worker (`sw.js`) handles asset caching.
- **Accessibility**: maintain keyboard navigability and ARIA labels throughout. The ARIA live region (`#aria-status`) announces dynamic changes to screen readers.
- **Performance**: the editor must remain responsive on large documents (100k+ words). Avoid blocking the main thread with synchronous localStorage operations.
- **String safety**: always use double-quoted strings or template literals when content may contain apostrophes. Unescaped apostrophes inside single-quoted JS string literals cause a `SyntaxError` that breaks the entire module graph.

## Claude Code Build Strategy

Claude Code with Sonnet 4.6 is the primary development tool. Here is how to get the best results for new phases.

### Session Structure

- Build one feature module at a time — one JS file per session for complex modules
- Start with the CSS file for a phase, then build JS modules, then wire into `app.js`
- Always read the relevant sections of `app.js` before modifying it — it is large
- Reference `CLAUDE.md` at the start of each session for context

### Tips

- Keep individual JS files under 400 lines — split into modules when they grow
- After adding a new phase, run: `for f in docs/js/*.js; do node --input-type=module --check < "$f"; done` to catch syntax errors before committing
- Unescaped apostrophes in single-quoted strings are the most common source of `SyntaxError` — always prefer double quotes when string content may contain apostrophes
- After each session, ask Claude Code to summarise what it built and note any open decisions
- The `initCommandPalette` `getActions` array is the central registration point for new features — always add entries there

### Completed Build Order

| Phase | Focus | Status |
|---|---|---|
| 1 | HTML shell, CSS layout, data model, rich text editor | ✅ Done |
| 2 | Corkboard, outline, scene metadata, inspector | ✅ Done |
| 3 | AI assistant panel (Claude API, user key) | ✅ Done |
| 4 | Import (.docx/.doc/Google Docs), themes, compile, snapshots | ✅ Done |
| 5 | EPUB/Kindle export, KDP/IngramSpark wizards | ✅ Done |
| 6 | Image import, base64 storage, reference panel | ✅ Done |
| 7 | Find & replace, streak calendar, ambient sounds, format paint | ✅ Done |
| 8 | Supabase sync, IndexedDB offline queue, Yjs collaboration, PWA | ✅ Done |
| 9 | Command palette, compile wizard, Markdown mode, responsive/touch | ✅ Done |
| 10 | Visual timeline, PDF viewer/annotator, snapshot browser, AI readability | ✅ Done |
| 11 | Statistics dashboard, keybindings, webhooks, prompt library, accessibility | ✅ Done |
| 12 | Character database, wiki links, plot templates, project template wizard | ✅ Done |
| 13 | Sprint timer, reading mode, smart typography, split editor | ✅ Done |

### Suggested Next Phases

| Session | Focus |
|---|---|
| 14 | Grammar & style AI — inline underlines, sidebar suggestions per sentence |
| 15 | Fountain / screenplay mode — slug lines, action, dialogue formatting |
| 16 | Text-to-speech — Web Speech API read-back for proofreading |
| 17 | Writing Prompts — built-in prompt generator for writer's block |
| 18 | Plugin API — third-party binder item types and export format extensions |

---

## Testing

There is no automated test runner configured. When adding one, prefer Vitest (zero config, browser-compatible). Unit tests live alongside source files as `*.test.js`.

### Pre-Commit Syntax Check

Run before every commit to catch `SyntaxError` before it reaches production:

```bash
for f in docs/js/*.js; do
  node --input-type=module --check < "$f" 2>&1 | grep -v "^$" && echo "ERROR: $f"
done
echo "All files clean"
```

### Manual Testing Checklist (run before merging to `main`)

- [ ] Create, rename, reorder, and delete documents in the binder
- [ ] Write, edit, and autosave a document
- [ ] Export to each supported format (txt, md, docx, EPUB)
- [ ] Import a .docx file and a JSON backup
- [ ] Open the command palette (Ctrl+K) and navigate to a document
- [ ] Verify the app loads and functions with no internet connection (disable Wi-Fi)
- [ ] Check keyboard navigation through all major UI surfaces
- [ ] Verify smart quotes work in the editor (type `"hello"`)
- [ ] Open the sprint timer and run a 1-minute sprint
- [ ] Open reading mode for a document and switch to manuscript view
- [ ] Toggle the split editor and verify the reference doc loads
