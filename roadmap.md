# Zero Pro — Roadmap

This document tracks the planned development of Zero Pro from its initial proof-of-concept through a mature, feature-complete writing environment. Milestones are organized by version. Features within each milestone are prioritized roughly from top to bottom.

---

## v0.1 — Proof of Concept _(current)_

The goal of v0.1 is a working skeleton: a writer can open the app, create a document, write in it, and have their work saved automatically.

- [x] Static GitHub Pages deployment
- [x] Single-document rich text editor (contenteditable)
- [x] Bold, italic, underline keyboard shortcuts
- [x] Auto-save to `localStorage`
- [x] Basic light and dark themes
- [x] Live word count in status bar

---

## v0.2 — The Binder

Introduce multi-document support so writers can organize a real project.

- [ ] Binder sidebar with document tree
- [ ] Create, rename, delete, and reorder documents
- [ ] Folder support (nested documents)
- [ ] Switch between documents without losing scroll position
- [ ] Per-document auto-save
- [ ] Document icons (scene, folder, research, trash)
- [ ] Soft-delete to Trash with restore

---

## v0.3 — Project Files and Export

Make projects portable and give writers a way to deliver their work.

- [ ] Save and open `.zeropro` project files using the File System Access API
- [ ] Export active document to `.txt` and `.md`
- [ ] Export full manuscript (compile) to `.txt` with configurable section separators
- [ ] Import `.txt` and `.md` files as new binder documents
- [ ] Paste-and-split: split pasted text into scenes on a chosen delimiter

---

## v0.4 — Writing Tools

Tools that help writers produce and revise more effectively.

- [ ] Session word count (resets on new session)
- [ ] Daily writing goal with progress indicator
- [ ] Project-level word count target and deadline mode
- [ ] Find and replace (single document)
- [ ] Snapshots: named point-in-time saves per document
- [ ] Snapshot diff view (side-by-side with color coding)

---

## v0.5 — Views and Metadata

Give writers multiple ways to see and organize their work.

- [ ] Corkboard view (index-card layout) for folder contents
- [ ] Outliner view (table) with title, synopsis, status, word count columns
- [ ] Per-document metadata: synopsis, status, label, keywords
- [ ] Color labels in binder and corkboard
- [ ] Inspector panel (document tab): metadata and synopsis editor
- [ ] Writing status values: To Do, In Progress, Done, Revised

---

## v0.6 — Revision and Annotation

Tools for the editing and revision phase.

- [ ] Inline comments attached to text selections
- [ ] Comment margin column (rendered alongside the editor)
- [ ] Multi-color highlight mode
- [ ] Inline annotations (bracketed, stripped at compile)
- [ ] Project-wide find and replace with regex support
- [ ] Format paint (copy inline styles between selections)

---

## v0.7 — Advanced Compile and Import

Expand export fidelity and import flexibility.

- [ ] Export to `.docx` (Microsoft Word) via a client-side library
- [ ] Export to PDF via browser print or client-side renderer
- [ ] Compile settings UI: include/exclude documents, separator style, front matter
- [ ] Import a folder of files as a structured binder
- [ ] Compile preview pane

---

## v0.8 — Polish and Performance

Make the app feel fast, stable, and accessible before public launch.

- [ ] Service worker for offline support and asset caching
- [ ] Virtualized document list for projects with 500+ documents
- [ ] Editor performance testing with 100k+ word documents
- [ ] Full keyboard navigation audit
- [ ] ARIA label and screen reader testing pass
- [ ] Command palette (Ctrl/Cmd+K) for actions and document search
- [ ] Customizable keyboard shortcuts
- [ ] Layout presets (Writing mode, Revision mode, Research mode)

---

## v0.9 — Beta

Feature freeze for community testing. Focus on stability.

- [ ] GitHub Actions CI: lint and run tests on every pull request
- [ ] Automated deployment to GitHub Pages on merge to `main`
- [ ] Unit tests for storage, compile, and binder logic
- [ ] In-app changelog and version display
- [ ] Bug bash with external testers
- [ ] Documentation site (GitHub Pages, separate repo or `/docs`)

---

## v1.0 — Public Launch

A complete, stable, public writing tool.

- [ ] All v0.x features stable and documented
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile-responsive layout (read and light edit on phone)
- [ ] Onboarding walkthrough for new users
- [ ] Sample project included with the app
- [ ] Public announcement and README update

---

## Post-1.0 Ideas (Backlog)

These are ideas under consideration for after the 1.0 launch. They are not committed to any milestone.

- **Cloud sync** — optional account-based sync via a minimal backend or a third-party storage provider (e.g., Dropbox API, GitHub Gists)
- **Real-time collaboration** — shared editing via WebRTC or a lightweight WebSocket server
- **Writing statistics** — historical word count graphs and streak tracking
- **Name generator** — built-in name lists filterable by region and style
- **Scratchpad** — persistent floating notepad independent of the binder
- **Typewriter scrolling** — keep the active line centered on screen
- **Custom themes** — user-defined color schemes with a theme editor
- **Plugin API** — allow third-party extensions to add binder item types, export formats, or editor commands
- **Distraction-free full-screen mode** — OS-level full screen with all UI hidden
- **Text-to-speech** — read back the current document using the Web Speech API
- **Writing prompts** — built-in prompt generator to help beat writer's block
- **Epub export** — package the compiled manuscript as an `.epub` file
- **Fountain / Final Draft support** — screenplay formatting mode

---

## Contributing

If you want to help shape the roadmap, open an issue on GitHub with the `roadmap` label. Bug reports, feature requests, and pull requests are welcome at any stage.
