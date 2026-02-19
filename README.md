# Zero Pro

**A Browser-Based Writing Suite for Novelists**

Zero Pro is a modern writing environment built for novelists and long-form writers — hosted on GitHub Pages, requiring no installation, no login, and no subscription to get started. It captures the organisational power of Scrivener and delivers it through a clean, fast, cross-platform web interface that works equally well on desktop, iPhone, and Android.

> **[zero-pro.app →](https://nors3ai.github.io/Zero-Pro/)**
> Version 1.0 · February 2026 · Built with Claude Code + Sonnet 4.6

---

## What Is Zero Pro?

Where Scrivener is desktop-first and complex, Zero Pro is browser-first and focused. Rather than replicating every Scrivener feature, it targets the core workflows that matter most to writers: organising chapters, tracking characters, and getting words on the page without friction.

- **No installation** — open a URL and start writing
- **No account required** — your data lives in your browser
- **No subscription** — free to use, with optional power features
- **Offline-capable** — works without an internet connection after first load

---

## Why GitHub Pages?

| Benefit | Detail |
|---|---|
| Zero hosting cost | Free and reliable at any scale |
| No backend required | All data stored locally in the browser |
| Instant global CDN | Fast everywhere in the world |
| Version-controlled source | The app itself lives in a git repo |
| Easy to fork and self-host | Community-friendly distribution |

---

## Competitive Positioning

Zero Pro sits between Scrivener (powerful but complex, desktop-only) and Google Docs (simple but unstructured). It directly addresses the most-requested gaps from the Scrivener user community:

| Gap in Scrivener | Zero Pro Solution |
|---|---|
| Desktop-only — no real Android app | PWA installable on Android from day one (Phase 9) |
| No real-time collaboration | Yjs CRDT-based live co-editing (Phase 8) |
| Compile is notoriously confusing | Simplified one-click export to .docx, .epub, .mobi (Phase 5) |
| No built-in Markdown mode | Full Markdown editor with live preview (Phase 10) |
| No PDF annotation | In-browser PDF annotation via PDF.js (Phase 10) |
| No timeline view | Visual chapter/scene timeline planner (Phase 11) |
| No cloud sync without Scrivener iOS | Optional Supabase cloud sync, offline-first (Phase 8) |
| Clunky iOS experience | Mobile-native responsive design from Phase 1 |
| No AI writing assistance | Claude-powered brainstorming, prose polish (Phase 3) |
| No publishing pipeline | Kindle EPUB/MOBI export + KDP guide (Phase 5) |

---

## Key Features

### Phase 1 — Core (Live Now)
- **Three-panel layout** — Binder, Editor, Inspector
- **Hierarchical binder** — Parts, Chapters, Scenes with drag-and-drop reordering
- **Rich text editor** — Bold, italic, underline, headings, autosave to localStorage
- **Focus / typewriter mode** — dims surrounding paragraphs to keep you in the zone
- **Export** — Plain text (.txt), Markdown (.md), Word (.docx), Word 97 (.doc)
- **Dark / light theme** — CSS custom properties, respects OS preference

### Phase 2 — Structure & Planning
- **Corkboard view** — drag-and-drop index cards with colour labels and synopsis
- **Outline view** — collapsible table with inline synopsis and status editing
- **Scene metadata** — status, POV, location, word count targets
- **Inspector panel** — scene details, notes, labels at a glance

### Phase 3 — AI Writing Assistant
- **Claude-powered brainstorming** — plot ideas, character backstory, world-building prompts
- **Prose polish** — rewrite, expand, condense selected passages
- **Name & dialogue generation** — genre-aware suggestions
- **User-supplied API key** — no backend cost, unlimited use

### Phase 4 — Import & Themes
- **Import** — .txt, .docx, .doc (mammoth.js), Google Docs paste (DOMPurify)
- **Themes** — Dark, Light, Sepia, High Contrast
- **Compile** — merge all scenes into a single document for export
- **Snapshot / version history** — restore previous drafts

### Phase 5 — Kindle & Publishing
- **EPUB 3 export** — clean, validated ebook packaging
- **Kindle / MOBI export** — direct-to-KDP ready files
- **Front & back matter templates** — title page, copyright, dedication, author bio
- **Publishing help modals** — KDP upload guide, formatting checklist

### Phase 6 — Images & Media
- **Image import** — drag-and-drop, paste, or file picker
- **Inline image display** — stored as base64 in localStorage
- **Image caption support** — in-editor caption below each image
- **Reference image panel** — attach mood-board images to scenes without inserting them

### Phase 7 — Polish & Nice-to-Haves
- **Split editor** — view two scenes side-by-side
- **Custom document icons** — assign emoji or symbol per document
- **Manuscript statistics** — daily / session word count graphs
- **Writing goals & streaks** — daily word targets with progress rings
- **Distraction-free fullscreen** — hides all chrome except the text

### Phase 8 — Cloud Sync & Collaboration
- **Optional Supabase cloud sync** — sign in once, access from any device
- **Offline-first** — IndexedDB queue syncs when back online
- **Real-time co-editing** — Yjs CRDT, cursor presence, conflict-free merges
- **Share links** — read-only or editor access via URL token

### Phase 9 — UX Modernisation & Android
- **PWA** — installable on Android home screen, service worker caching
- **Command palette** — Ctrl+K fuzzy search for documents, commands, settings
- **Keyboard shortcut map** — discoverable, customisable shortcuts
- **Drag-between-panels** — drag cards from corkboard into binder
- **Animated transitions** — panel open/close, card flip, mode switch

### Phase 10 — Advanced Writing Tools
- **Markdown mode** — write in raw Markdown with live preview pane
- **Distraction-free Markdown editor** — CodeMirror-powered, syntax highlighted
- **PDF annotation** — open research PDFs, highlight and annotate in-browser
- **AI grammar & style check** — run selected text through Claude for line edits
- **Find & replace** — across current document or entire project

### Phase 11 — Quality of Life
- **Visual timeline** — horizontal swimlane chart of chapters and scenes by date
- **Snapshot search** — full-text search across all saved snapshots
- **Read-aloud mode** — Web Speech API narrates selected text
- **Custom CSS** — power users can override any style variable
- **Keyboard-only navigation** — full ARIA tree for screen-reader support

See [features.md](features.md) for the complete feature specification with priority, phase, and complexity ratings.

---

## Roadmap

| Phase | Timeline | Goal | Status |
|---|---|---|---|
| **Phase 1** | Weeks 1–3 | Core editor, binder, localStorage, .docx/.doc export | **Done ✅** |
| **Phase 2** | Weeks 4–6 | Corkboard, outline view, scene metadata, inspector | Next |
| **Phase 3** | Weeks 7–10 | AI writing assistant (Claude API, user key) | Planned |
| **Phase 4** | Weeks 11–14 | Import (.docx/.doc/Google Docs), themes, compile, snapshots | Planned |
| **Phase 5** | Weeks 15–17 | Kindle / EPUB / MOBI export, publishing help modals | Planned |
| **Phase 6** | Weeks 18–19 | Image import, inline display, reference image panel | Planned |
| **Phase 7** | Weeks 20–22 | Split editor, statistics, writing goals, fullscreen | Planned |
| **Phase 8** | Weeks 23–26 | Cloud sync (Supabase), offline-first, real-time collaboration | Planned |
| **Phase 9** | Weeks 27–30 | PWA / Android, command palette, animated transitions | Planned |
| **Phase 10** | Weeks 31–34 | Markdown mode, PDF annotation, AI grammar, find & replace | Planned |
| **Phase 11** | Weeks 35–38 | Timeline, snapshot search, read-aloud, custom CSS | Planned |

See [roadmap.md](roadmap.md) for full milestone details and implementation checklists.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | HTML / CSS / Vanilla JavaScript — no framework, no build step |
| Storage | localStorage (Phase 1–7) → IndexedDB + Supabase (Phase 8+) |
| Theming | CSS Custom Properties (`data-theme` on `<html>`) |
| Layout | CSS Grid (three-panel) + Flexbox |
| Drag & drop | Sortable.js (CDN, 4KB) |
| .docx export | html-docx-js (CDN) |
| .doc export | Hand-generated RTF (no dependency) |
| .epub export | JSZip + epub.js (Phase 5) |
| HTML sanitise | DOMPurify (Phase 4 import) |
| .docx import | mammoth.js (Phase 4) |
| Markdown | Marked.js (Phase 4+) |
| Real-time sync | Yjs CRDT (Phase 8) |
| Cloud backend | Supabase Auth + Postgres (Phase 8, optional) |
| AI | Anthropic API — user-supplied key (Phase 3) |
| PDF | PDF.js (Phase 10) |
| Editor (MD) | CodeMirror (Phase 10) |
| Hosting | GitHub Pages, `/docs` folder, `main` branch |

---

## Getting Started (Development)

Serve the project with any local HTTP server — no build step required:

```bash
# Python
python3 -m http.server 8080 --directory docs

# Node
npx serve docs
```

Open `http://localhost:8080`. Do not open `index.html` via `file://` — some browser APIs require a secure context.

See [CLAUDE.md](CLAUDE.md) for the full development guide, project structure, and Claude Code session playbook.

---

## Monetisation

**Free tier (GitHub Pages):** Full Phase 1–7 features, no account required, no limits on projects or word count. This is the hook — a generous free tier drives adoption.

**Optional upgrades:**
- Ko-fi / Buy me a coffee — voluntary support
- One-time payment ($15–25) for Phase 5 export features (EPUB, Kindle) and custom themes
- Monthly subscription ($4–6/month) for cloud sync and collaboration via Supabase (Phase 8)
- PWA / Android install — free (Phase 9)

**AI features:** Users supply their own Anthropic API key — zero cost to the project, unlimited use for writers. An optional managed key can be offered at $3–5/month for writers who prefer a simpler setup.

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. Open an issue with the `roadmap` label to suggest new features or vote on existing ones.
