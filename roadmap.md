# Zero Pro — Product Roadmap

The project is structured into four phases, each delivering a usable, shippable product. Each phase builds on the last without requiring the next to be valuable.

| Phase | Timeline | Goal | Status |
|---|---|---|---|
| Phase 1 | Weeks 1–3 | Core editor with project binder and local storage | **Start Here** |
| Phase 2 | Weeks 4–6 | Corkboard, outline view, and scene metadata | Next |
| Phase 3 | Weeks 7–10 | AI writing assistant (Claude API integration) | Planned |
| Phase 4 | Weeks 11–14 | Export, import, themes, and distribution | Future |

---

## Phase 1 — The Writing Foundation _(Weeks 1–3)_

**Goal:** A writer can open the app, create a project, organise it into chapters and scenes, write in a distraction-free editor, and come back the next day with everything intact.

### 1.1 Project Shell
- [ ] `index.html` entry point with three-panel CSS Grid layout
- [ ] Binder panel (left), Editor panel (centre), Inspector panel (right)
- [ ] Collapsible panels — toggle binder and inspector independently
- [ ] Dark mode / light mode toggle (CSS custom properties, respects OS preference)
- [ ] Responsive single-panel layout for mobile

### 1.2 Data Model & Storage (`storage.js`)
- [ ] Define the project JSON schema: `Project`, `Document`, `Settings`
- [ ] `createProject()`, `loadProject()`, `saveProject()` functions
- [ ] `createDocument()`, `updateDocument()`, `deleteDocument()` functions
- [ ] Debounced autosave to `localStorage` on every edit
- [ ] Load project on page open; handle empty state (new project prompt)

### 1.3 Binder (`binder.js`)
- [ ] Render the document tree from the project JSON
- [ ] Add document / add folder buttons
- [ ] Inline rename on double-click
- [ ] Delete with confirmation (soft-delete to Trash)
- [ ] Drag-and-drop reorder using Sortable.js
- [ ] Expand / collapse folders; persist state in localStorage
- [ ] SVG icons for folder vs scene vs trash

### 1.4 Editor (`editor.js`)
- [ ] `contenteditable` rich text area with formatting toolbar
- [ ] Bold, italic, underline, strikethrough (keyboard shortcuts + buttons)
- [ ] Heading styles H1–H3, paragraph, first-line indent
- [ ] Live word count in status bar (updates on `input` event)
- [ ] Typewriter / focus mode: blur paragraphs above and below cursor
- [ ] Load selected binder document into editor; save on switch

### 1.5 Basic Export
- [ ] Export current document as `.txt` (Blob download)
- [ ] Export current document as `.md` (strip HTML tags, convert to Markdown)

---

## Phase 2 — The Corkboard & Structure _(Weeks 4–6)_

**Goal:** Visual planning tools that let writers see and reorganise their manuscript without opening every document.

### 2.1 Corkboard (`corkboard.js`)
- [ ] CSS Grid index-card layout for all scenes in the selected folder
- [ ] Each card shows: title, synopsis (editable inline), word count badge
- [ ] Colour label strip across the top of each card
- [ ] Drag-and-drop reorder cards; sync order back to binder tree
- [ ] Click card to open scene in editor
- [ ] Card zoom slider (CSS variable for card width)

### 2.2 Outline View (`outline.js`)
- [ ] Table layout: title, synopsis, status, word count, label columns
- [ ] Collapsible folder rows
- [ ] Inline synopsis editing (click cell to edit)
- [ ] Status dropdown per row: Not Started / Draft / Revised / Final
- [ ] Target word count column with progress bar

### 2.3 Inspector Panel (`inspector.js`)
- [ ] Document tab: title, synopsis, status, label, POV, location, keywords
- [ ] Project tab: author, working title, genre, total word count, deadline
- [ ] All fields save back to the document JSON on change

### 2.4 Writing Targets
- [ ] Per-document target word count with progress bar in inspector
- [ ] Project-level target with progress bar in status bar
- [ ] Deadline mode: calculate words-per-day needed and display in status bar
- [ ] Writing session timer: tracks words written since the editor was opened
- [ ] Daily word count tracker with streak indicator

### 2.5 Project Notes Panel
- [ ] Freeform notes panel (separate from the binder) for world-building and research
- [ ] Persisted in the project JSON under a `notes` key
- [ ] Basic formatting (bold, italic, headings) using the same editor component

---

## Phase 3 — AI Writing Assistant _(Weeks 7–10)_

**Goal:** A Claude-powered sidebar that acts as an intelligent creative partner. No backend — the user supplies their own Anthropic API key.

### 3.1 API Key Setup
- [ ] Settings panel with API key input field
- [ ] Store key in `localStorage` (warn user it is stored locally)
- [ ] Validate key on entry with a test request; show status indicator
- [ ] Clear key button

### 3.2 Ask Claude Sidebar (`ai.js`)
- [ ] Collapsible sidebar panel with a prompt input and response area
- [ ] Send selected editor text + surrounding paragraph as context with every request
- [ ] Streaming response display (Anthropic streaming API)
- [ ] Insert response into document at cursor with one click
- [ ] Copy response to clipboard button

### 3.3 Prompt Templates
- [ ] Scene brainstorming: "Give me 5 ways this scene could go differently"
- [ ] Prose polish: rewrite selection in tighter prose / different tone / simpler language
- [ ] Continue writing: generate the next 200 words in the author's established style
- [ ] Character voice check: compare selected dialogue against the character's profile notes
- [ ] Plot summary: summarise the full manuscript chapter by chapter
- [ ] Name generator: suggest genre-appropriate names for characters and places

### 3.4 Context Management
- [ ] Include the active document title and synopsis in every request
- [ ] Option to include the full project synopsis for plot-level requests
- [ ] Token count estimate shown before sending a request
- [ ] Configurable context window (include N previous scenes)

---

## Phase 4 — Export, Import & Distribution _(Weeks 11–14)_

**Goal:** Writers can move their work in and out of Zero Pro in every format they need, and the app is ready for broader distribution.

### 4.1 Import (`import.js`)
- [ ] Import `.txt` — creates a new binder document, preserves paragraph breaks
- [ ] Import `.md` — converts Markdown headings to scene/chapter structure
- [ ] Import `.docx` — strip Word XML, extract plain text (use `mammoth.js`, ~40KB)
- [ ] Import `.doc` — convert via mammoth.js where supported; fallback to plain text
- [ ] Import from Google Docs — paste-from-clipboard flow (Google Docs clipboard is rich HTML; sanitise with DOMPurify and convert)
- [ ] Paste-and-split: paste large text and split into scenes on a chosen delimiter (e.g. `###`)
- [ ] Import entire project from `.zeropro` JSON backup file

### 4.2 Export (`export.js`)
- [ ] Export as `.txt` — plain text, one scene per section, configurable separator
- [ ] Export as `.md` — Markdown with heading hierarchy matching binder structure
- [ ] Export as `.docx` — formatted manuscript using `docx.js` (~60KB); double-spaced, 12pt Times, running headers
- [ ] Export as `.doc` — convert DOCX blob to legacy format via a lightweight shim (best-effort)
- [ ] Export to Google Docs — copy rich HTML to clipboard with instructions, or open Google Docs import flow via URL scheme
- [ ] Export as PDF — CSS `@media print` stylesheet in standard submission format; trigger browser print dialog
- [ ] Export as HTML — self-contained single file with inline styles
- [ ] Compile entire manuscript: choose which documents to include, set separator style, prepend title page
- [ ] Export entire project as `.zeropro` JSON backup

### 4.3 Manuscript Formatter
- [ ] Compile settings UI: include/exclude documents, section separator (`***` / blank line / page break)
- [ ] Front matter template: title page with author name, title, word count, contact info
- [ ] Strip AI annotations and comments from compiled output
- [ ] Preview pane before download

### 4.4 Themes & Polish
- [ ] Typeface selector: Georgia (serif), Arial (sans), Courier (mono)
- [ ] Font size and line height controls (CSS variable sliders)
- [ ] Sepia / warm paper theme
- [ ] Custom accent colour (HSL hue slider)
- [ ] Ambient sound player: rain, café, white noise (Web Audio API)
- [ ] Service worker for offline caching of all app assets
- [ ] Multiple project workspaces (switch projects without clearing localStorage)

### 4.5 Distribution
- [ ] iOS App Store version: WKWebView wrapper in Xcode, packaged as a native app
- [ ] Optional Pro tier backend: cloud sync via Supabase or Cloudflare Workers
- [ ] Ko-fi / Buy Me a Coffee integration in the app footer
- [ ] In-app changelog and version display

---

## Claude Code Build Order

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
| 9 | Import/export (.txt, .md, .docx, Google Docs, JSON backup) |
| 10 | Claude API integration — sidebar, prompt templates |

---

## Post-Launch Backlog

- **Real-time collaboration** — shared editing via WebRTC or a lightweight WebSocket server
- **Writing statistics** — historical word count graphs and streak tracking
- **Scratchpad** — persistent floating notepad independent of the binder
- **Plugin API** — allow third-party extensions to add binder item types or export formats
- **Text-to-speech** — read back the current document using the Web Speech API
- **Writing prompts** — built-in prompt generator to help beat writer's block
- **EPUB export** — package the compiled manuscript as an `.epub` file
- **Fountain / Final Draft support** — screenplay formatting mode
- **Split corkboard** — show two folders side-by-side

---

## Contributing

Open an issue on GitHub with the `roadmap` label to suggest new features or vote on existing ones. Bug reports and pull requests are welcome at any phase.
