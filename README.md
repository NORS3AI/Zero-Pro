# Zero Pro

**A Browser-Based Writing Suite for Novelists**

Zero Pro is a modern writing environment built for novelists and long-form writers — hosted on GitHub Pages, requiring no installation, no login, and no subscription to get started. It captures the organisational power of Scrivener and delivers it through a clean, fast, cross-platform web interface that works equally well on desktop, iPhone, and Android.

> **[zero-pro.app →](https://nors3ai.github.io/Zero-Pro/)**
> Version 1.13 · February 2026 · Built with Claude Code + Sonnet 4.6

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
| Desktop-only — no real Android app | PWA installable on Android home screen (Phase 9) |
| No real-time collaboration | Yjs CRDT-based live co-editing (Phase 8) |
| Compile is notoriously confusing | Step-by-step compile wizard with preview (Phase 9) |
| No built-in Markdown mode | Full Markdown editor with live preview toggle (Phase 9) |
| No PDF annotation | In-browser PDF annotation via PDF.js (Phase 10) |
| No timeline view | Visual scene/chapter timeline with POV lanes (Phase 10) |
| No cloud sync without Scrivener iOS | Optional Supabase cloud sync, offline-first (Phase 8) |
| Clunky iOS experience | Mobile-native responsive design from Phase 1 |
| No AI writing assistance | Claude-powered brainstorming, prose polish (Phase 3) |
| No publishing pipeline | Kindle EPUB/MOBI export + KDP/IngramSpark wizards (Phase 5) |
| No character database | Built-in character profiles with two-pane editor (Phase 12) |
| No smart typography | Context-aware curly quotes, em-dashes, ellipses (Phase 13) |

---

## Key Features

### Phase 1 — Core ✅
- **Three-panel layout** — Binder, Editor, Inspector
- **Hierarchical binder** — Parts, Chapters, Scenes with drag-and-drop reordering
- **Rich text editor** — Bold, italic, underline, headings, autosave to localStorage
- **Focus / typewriter mode** — dims surrounding paragraphs to keep you in the zone
- **Export** — Plain text (.txt), Markdown (.md), Word (.docx), Word 97 (.doc)
- **Dark / light theme** — CSS custom properties, respects OS preference

### Phase 2 — Structure & Planning ✅
- **Corkboard view** — drag-and-drop index cards with colour labels and synopsis
- **Outline view** — collapsible table with inline synopsis and status editing
- **Scene metadata** — status, POV, location, word count targets
- **Inspector panel** — scene details, notes, labels at a glance

### Phase 3 — AI Writing Assistant ✅
- **Claude-powered brainstorming** — plot ideas, character backstory, world-building prompts
- **Prose polish** — rewrite, expand, condense selected passages
- **Name & dialogue generation** — genre-aware suggestions
- **User-supplied API key** — no backend cost, unlimited use

### Phase 4 — Import & Themes ✅
- **Import** — .txt, .docx, .doc (mammoth.js), Google Docs paste (DOMPurify)
- **Themes** — Dark, Light, Sepia, and more via CSS custom properties
- **Compile** — merge all scenes into a single document for export
- **Snapshot / version history** — restore previous drafts per document

### Phase 5 — Kindle & Publishing ✅
- **EPUB 3 export** — clean, validated ebook packaging with cover and TOC
- **KDP formatting wizard** — one-click Amazon KDP-ready formatting
- **IngramSpark wizard** — print-on-demand bleed, trim, and page numbers
- **Agent submission formatter** — 12pt Times, double-spaced, running header
- **Front & back matter templates** — title page, copyright, dedication, author bio

### Phase 6 — Images & Media ✅
- **Image import** — drag-and-drop, paste, or file picker; stored as base64
- **Inline image display** — resize and align (left / right / centred)
- **Reference image panel** — attach mood-board images to scenes without embedding
- **Research binder type** — dedicated folder for images and web clippings

### Phase 7 — Polish & Nice-to-Haves ✅
- **Find & replace** — regex-capable, across document or entire project
- **Custom document icons** — assign emoji or symbol per document
- **Writing goals & streaks** — daily word targets with progress rings and calendar
- **Ambient sounds** — rain, café, fireplace, white noise (Web Audio API)
- **Right-click context menu** — rename, duplicate, label, delete
- **Format paint** — copy inline styles from one selection and apply to another

### Phase 8 — Cloud Sync & Collaboration ✅
- **Optional Supabase cloud sync** — sign in once, access from any device
- **Offline-first** — IndexedDB queue syncs when back online
- **Real-time co-editing** — Yjs CRDT, cursor presence, conflict-free merges
- **Share links** — read-only or editor access via URL token
- **PWA / service worker** — full offline functionality after first load

### Phase 9 — UX Modernisation & Android ✅
- **Command palette** — Ctrl+K fuzzy search for documents, commands, settings
- **Compile wizard** — step-by-step UI with WYSIWYG preview and preset saving
- **Settings modal** — searchable sections: Editor / Themes / Export / Sync / AI
- **Android PWA** — installable on Android home screen from Chrome
- **Touch gesture navigation** — swipe left/right to switch panels on mobile
- **Markdown mode** — per-document toggle; stored as plain text with live preview
- **Custom accent colour & font pairing** — UI vs editor fonts independently set

### Phase 10 — Advanced Writing Tools ✅
- **Visual timeline** — horizontal swimlane chart of chapters/scenes by date, POV lanes
- **Story order vs chronological toggle** — switch narrative vs real-world ordering
- **Snapshot browser** — full-text search across all snapshots; paragraph-level restore
- **PDF viewer** — open research PDFs in-browser via PDF.js
- **PDF annotation** — colour-coded highlights with margin notes stored in project JSON
- **AI readability** — Flesch-Kincaid score + Claude tone analysis in Inspector
- **Scene Date & Duration fields** — in Inspector for timeline planning

### Phase 11 — Quality of Life & Power Features ✅
- **Writing Statistics Dashboard** — daily/weekly/monthly bar chart, velocity, CSV export (Ctrl+Shift+D)
- **Keyboard Shortcuts panel** — searchable, click Edit to remap any shortcut (Ctrl+?)
- **Webhooks & Automation** — outbound POST webhooks for on_save, on_target, on_snapshot, on_export
- **Batch Rename** — rename all scenes in a folder with pattern tokens (`{n}`, `{title}`, `{folder}`)
- **Prompt Library** — save and reuse personal Claude AI prompt templates
- **High-Contrast Mode** — WCAG AA toggle in Settings → Accessibility
- **RTL support** — right-to-left editor direction for Arabic, Hebrew, and similar scripts
- **ARIA live region** — announces view switches and saves to screen readers

### Phase 12 — Story Planning & Smart Templates ✅
- **Character Database** — two-pane modal with name, role, age, appearance, arc, notes; avatar initials
- **Wiki-style cross-document links** — type `[[` in the editor to link any document by title
- **Plot Structure Templates** — Three-Act, Hero's Journey (12 stages), Save the Cat (15 beats), Freytag's Pyramid
- **New Project from Template wizard** — Novel, Short Story, Non-Fiction, Journal, Screenplay starters

### Phase 13 — Focus, Sessions & Smart Editing ✅
- **Writing Sprint Timer** — SVG countdown ring HUD, 5/15/25/45-minute presets, live WPM, personal best
- **Reading Mode** — full-screen overlay with font/width/size controls; single doc or full manuscript
- **Smart Typography** — auto curly quotes, em-dash (`--→—`), ellipsis (`...→…`); browser undo integration
- **Split Editor** — side-by-side CSS Grid pane; choose any reference document from a dropdown

See [features.md](features.md) for the complete feature specification with priority, phase, and complexity ratings.

---

## Roadmap

| Phase | Timeline | Goal | Status |
|---|---|---|---|
| **Phase 1** | Weeks 1–3 | Core editor, binder, localStorage, .docx/.doc export | **Done ✅** |
| **Phase 2** | Weeks 4–6 | Corkboard, outline view, scene metadata, inspector | **Done ✅** |
| **Phase 3** | Weeks 7–10 | AI writing assistant (Claude API, user key) | **Done ✅** |
| **Phase 4** | Weeks 11–14 | Import (.docx/.doc/Google Docs), themes, compile, snapshots | **Done ✅** |
| **Phase 5** | Weeks 15–17 | Kindle / EPUB / MOBI export, publishing help modals | **Done ✅** |
| **Phase 6** | Weeks 18–19 | Image import, inline display, reference image panel | **Done ✅** |
| **Phase 7** | Weeks 20–22 | Find & replace, statistics, writing goals, ambient sounds | **Done ✅** |
| **Phase 8** | Weeks 23–26 | Cloud sync (Supabase), offline-first, real-time collaboration | **Done ✅** |
| **Phase 9** | Weeks 27–30 | PWA / Android, command palette, compile wizard, Markdown mode | **Done ✅** |
| **Phase 10** | Weeks 31–34 | Timeline, PDF viewer/annotator, snapshot browser, AI readability | **Done ✅** |
| **Phase 11** | Weeks 35–38 | Statistics dashboard, webhooks, accessibility, prompt library | **Done ✅** |
| **Phase 12** | Weeks 39–42 | Character database, wiki links, plot templates, project wizard | **Done ✅** |
| **Phase 13** | Weeks 43–46 | Sprint timer, reading mode, smart typography, split editor | **Done ✅** |
| **Phase 14** | Weeks 47–50 | Feature onboarding, contextual tooltips, in-app help panel | Planned |

See [roadmap.md](roadmap.md) for full milestone details and implementation checklists.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | HTML / CSS / Vanilla JavaScript — no framework, no build step |
| Storage | localStorage + IndexedDB (offline queue) |
| Cloud sync | Supabase Auth + Postgres (optional, Phase 8) |
| Theming | CSS Custom Properties (`data-theme` on `<html>`) |
| Layout | CSS Grid (three-panel) + Flexbox |
| Drag & drop | Sortable.js (CDN) |
| .docx export | html-docx-js (CDN) |
| .doc export | Hand-generated RTF (no dependency) |
| .epub export | JSZip (CDN) |
| HTML sanitise | DOMPurify (CDN) |
| .docx import | mammoth.js (CDN) |
| Markdown | Marked.js (CDN) |
| Real-time sync | Yjs CRDT (CDN) |
| AI | Anthropic API — user-supplied key |
| PDF | PDF.js v3 (CDN) |
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

**Free tier (GitHub Pages):** Full Phase 1–13 features, no account required, no limits on projects or word count. This is the hook — a generous free tier drives adoption.

**Optional upgrades:**
- Ko-fi / Buy me a coffee — voluntary support
- One-time payment ($15–25) for Phase 5 export features (EPUB, Kindle) and custom themes
- Monthly subscription ($4–6/month) for cloud sync and collaboration via Supabase (Phase 8)
- PWA / Android install — free (Phase 9)

**AI features:** Users supply their own Anthropic API key — zero cost to the project, unlimited use for writers. An optional managed key can be offered at $3–5/month for writers who prefer a simpler setup.

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. Open an issue with the `roadmap` label to suggest new features or vote on existing ones.
