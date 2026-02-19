# Zero Pro — Claude Code Guide

## Project Overview

Zero Pro is a browser-based writing application hosted on GitHub Pages. It is inspired by Scrivener and designed to give writers a powerful, distraction-free environment without requiring any software installation. Everything runs in the browser; no backend, no accounts, no setup.

The core philosophy: a writer should be able to open a URL and immediately start writing, organizing, and revising their work.

## Tech Stack

- **Runtime**: Vanilla HTML, CSS, and JavaScript (no build step required for GitHub Pages compatibility)
- **Storage**: `localStorage` and the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for local file persistence
- **Hosting**: GitHub Pages (static files only — no server-side code)
- **Export**: Client-side generation of `.txt`, `.md`, `.docx`, and `.pdf` via browser APIs and lightweight libraries
- **No framework lock-in**: Components are plain JS modules to keep the project approachable and dependency-light

### Recommended Libraries (small, focused — vendored in `/libs`)

| Library | Size | Purpose |
|---|---|---|
| Sortable.js | 4KB gzipped | Drag-and-drop for binder and corkboard |
| Marked.js | 22KB | Markdown export and preview |
| DOMPurify | 12KB | Sanitise any pasted HTML content |

No React, no Vue, no build pipeline. Keep it simple for Claude Code iteration.

## Project Structure

```
Zero-Pro/
├── index.html          # App entry point
├── CLAUDE.md           # This file
├── features.md         # Current feature set
├── roadmap.md          # Development roadmap
├── css/
│   ├── main.css        # Global styles and CSS custom properties
│   ├── editor.css      # Editor pane styles
│   └── sidebar.css     # Binder / sidebar styles
├── js/
│   ├── app.js          # App bootstrap and initialization
│   ├── editor.js       # Rich text editor logic
│   ├── binder.js       # Document tree / binder logic
│   ├── storage.js      # localStorage and File System API abstraction
│   ├── export.js       # Export handlers (txt, md, docx, pdf)
│   └── ui.js           # UI helpers, modals, notifications
├── assets/
│   └── icons/          # SVG icons
└── libs/               # Vendored third-party libraries (no npm)
```

## Development Guidelines

### Running Locally

Because the app is pure static HTML/JS/CSS, serve it with any local HTTP server:

```bash
# Python
python3 -m http.server 8080

# Node (if npx is available)
npx serve .
```

Then open `http://localhost:8080` in your browser.

Do **not** open `index.html` directly via `file://` — the File System Access API requires a secure context (`http://localhost` or `https://`).

### Code Conventions

- Use ES modules (`type="module"` on script tags). Avoid CommonJS.
- Prefer `const` and `let`; never `var`.
- Keep functions small and single-purpose. Aim for files under 300 lines.
- All user-facing strings belong in `js/strings.js` to make future i18n easier.
- CSS variables live in `:root` in `main.css`. Do not hardcode colors or spacing.
- No TypeScript is required, but JSDoc comments on exported functions are welcome.

### Branching

- `main` — stable, always deployable to GitHub Pages
- `dev` — integration branch for in-progress work
- Feature branches: `feature/<short-description>`
- Bugfix branches: `fix/<short-description>`

### Commits

Use the conventional commits format:

```
feat: add word count to status bar
fix: prevent binder drag-drop from duplicating nodes
docs: update roadmap with v0.3 milestones
refactor: extract storage abstraction into storage.js
```

### Deploying to GitHub Pages

GitHub Pages is configured to serve from the `main` branch root. Merging to `main` deploys automatically. There is no CI pipeline yet — see the roadmap for planned GitHub Actions integration.

## Key Constraints

- **No server**: all logic must run client-side. Do not introduce Node.js, PHP, or any server dependency.
- **No mandatory accounts**: users must be able to use the app without signing in. Cloud sync is an optional future feature.
- **Offline-first**: the app should be fully functional without an internet connection after the initial page load. Prefer a service worker for caching assets.
- **Accessibility**: maintain keyboard navigability and ARIA labels throughout. Writers may rely on screen readers or keyboard-only navigation.
- **Performance**: the editor must remain responsive on large documents (100k+ words). Virtualize long document lists; avoid blocking the main thread.

## Claude Code Build Strategy

Claude Code with Sonnet 4.6 is the primary development tool. Here's how to get the best results across a project of this complexity.

### Session Structure

- Build one feature module at a time — don't try to build everything in one prompt
- Start with the data model and localStorage functions before any UI
- Build the three-panel layout shell before adding panel content
- Add the binder tree before the editor, add the editor before the corkboard
- Reference `CLAUDE.md` at the start of each session for context

### Tips

- Keep individual JS files under 400 lines — split into modules (`binder.js`, `editor.js`, `corkboard.js`)
- Ask Claude Code to write JSDoc comments as it goes — helps it stay consistent across sessions
- After each session, ask Claude Code to summarise what it built and note any open decisions
- Use the Inspector panel feature to test localStorage persistence before building more UI
- Reference Sonnet 4.6 — it reads context better than previous models before modifying existing code

### Recommended Build Order

| Session | Focus |
|---|---|
| 1 | HTML shell, CSS layout (three panels, dark/light mode) |
| 2 | localStorage data model, project CRUD functions |
| 3 | Binder tree with add/rename/delete/reorder |
| 4 | Rich text editor with formatting toolbar and autosave |
| 5 | Word count, focus mode, typewriter mode |
| 6 | Corkboard — card grid, drag to reorder, colour labels |
| 7 | Outline view — table layout, inline editing |
| 8 | Inspector panel — metadata, synopsis, status, targets |
| 9 | Export functions (text, Markdown, JSON backup/restore) |
| 10 | Claude API integration — sidebar, prompt templates |

---

## Testing

There is no test runner configured yet. When adding one, prefer a zero-config option such as Vitest or the native browser test runner. Unit tests live alongside source files as `*.test.js`.

Manual testing checklist (run before merging to `main`):

- [ ] Create, rename, reorder, and delete documents in the binder
- [ ] Write, edit, and autosave a document
- [ ] Export to each supported format
- [ ] Import an existing project file
- [ ] Verify the app loads and functions with no internet connection
- [ ] Check keyboard navigation through all major UI surfaces
