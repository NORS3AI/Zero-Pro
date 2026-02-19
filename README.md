# Zero Pro

**A Browser-Based Writing Suite for Novelists**

Zero Pro is a modern writing environment built for novelists and long-form writers — hosted on GitHub Pages, requiring no installation, no login, and no subscription to get started. It captures the organisational power of Scrivener and delivers it through a clean, fast, mobile-friendly web interface that works equally well on desktop and iPhone Safari.

> **[zero-pro.app →](https://nors3ai.github.io/Zero-Pro/docs/)**
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

Zero Pro sits between Scrivener (powerful but complex, desktop-only) and Google Docs (simple but unstructured).

- Scrivener for iOS is clunky — Zero Pro is mobile-native from day one
- No writing tool offers a beautiful corkboard in a browser
- AI-assisted writing (Claude-powered) is not available in any Scrivener-tier tool
- Free-to-start with optional power features removes the friction of a $50 purchase

---

## Key Features

- **Three-panel layout** — Binder, Editor, Inspector
- **Hierarchical binder** — Parts, Chapters, Scenes with drag-and-drop reordering
- **Rich text editor** — formatting, focus mode, typewriter mode, autosave
- **Corkboard view** — drag-and-drop index cards with colour labels
- **Outline view** — collapsible table with inline synopsis editing
- **Scene metadata** — status, POV, location, word count targets
- **AI writing assistant** — Claude-powered brainstorming, prose polish, name generation
- **Export** — Markdown, plain text, HTML, PDF, DOCX, JSON backup

See [features.md](features.md) for the full specification.

---

## Roadmap

| Phase | Goal | Status |
|---|---|---|
| Phase 1 — Weeks 1–3 | Core editor, binder, local storage | **Start Here** |
| Phase 2 — Weeks 4–6 | Corkboard, outline view, scene metadata | Next |
| Phase 3 — Weeks 7–10 | AI writing assistant (Claude API) | Planned |
| Phase 4 — Weeks 11–14 | Export, themes, App Store wrapper | Future |

See [roadmap.md](roadmap.md) for full milestone details.

---

## Tech Stack

- **HTML / CSS / Vanilla JavaScript** — no framework, no build step
- **localStorage API** — primary data store; no backend required
- **CSS Custom Properties** — theming, dark mode, font controls
- **CSS Grid + Flexbox** — three-panel layout and corkboard
- **Sortable.js** (4KB) — drag-and-drop for binder and corkboard
- **Marked.js** (22KB) — Markdown export
- **DOMPurify** (12KB) — sanitise pasted HTML
- **Anthropic API** (Phase 3) — user-supplied API key, no backend needed

---

## Getting Started (Development)

Serve the project with any local HTTP server — no build step required:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Open `http://localhost:8080`. Do not open `index.html` via `file://` — the File System Access API requires a secure context.

See [CLAUDE.md](CLAUDE.md) for the full development guide, project structure, and Claude Code session playbook.

---

## Monetisation

**Free tier (GitHub Pages):** Full Phase 1 + Phase 2 features, no account required, no limits on projects or word count. This is the hook — a generous free tier drives adoption.

**Optional upgrades:**
- Ko-fi / Buy me a coffee — voluntary support
- One-time payment ($15–25) for Phase 4 export features and themes
- Monthly subscription ($4–6/month) for cloud sync via a Supabase backend
- App Store version ($4.99) — iOS wrapper via WKWebView

**AI features:** Users supply their own Anthropic API key — zero cost to the project, unlimited use for writers. An optional managed key can be offered at $3–5/month for writers who prefer a simpler setup.

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. Open an issue with the `roadmap` label to suggest new features or vote on existing ones.
