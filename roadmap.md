# Zero Pro — Product Roadmap

Each phase delivers a usable, shippable product. Phases build on each other but no phase requires the next to be valuable.

| Phase | Timeline | Goal | Status |
|---|---|---|---|
| Phase 1 | Weeks 1–3 | Core editor, binder, local storage | **Done** |
| Phase 2 | Weeks 4–6 | Corkboard, outline view, scene metadata | **Done** |
| Phase 3 | Weeks 7–10 | AI writing assistant (Claude API) | **Done** |
| Phase 4 | Weeks 11–14 | Import/export, themes, App Store wrapper | **Done** |
| Phase 5 | Weeks 15–17 | Kindle & publishing support | **Done** |
| Phase 6 | Weeks 18–19 | Image import & media support | **Done** |
| Phase 7 | Weeks 20–22 | Nice-to-haves & UI polish | **Done** |
| Phase 8 | Weeks 23–26 | Cloud sync & real-time collaboration | Planned |
| Phase 9 | Weeks 27–30 | UX modernisation & Android / PWA | Planned |
| Phase 10 | Weeks 31–34 | Advanced writing tools | Planned |
| Phase 11 | Weeks 35–38 | Quality of life & power features | Planned |

---

## Phase 1 — The Writing Foundation _(Weeks 1–3)_ ✅

**Goal:** A writer can open the app, create a project, organise it into chapters and scenes, write in a distraction-free editor, and come back the next day with everything intact.

### 1.1 Project Shell
- [x] `index.html` entry point with three-panel CSS Grid layout
- [x] Binder panel (left), Editor panel (centre), Inspector panel (right)
- [x] Collapsible panels — toggle binder and inspector independently
- [x] Dark mode / light mode toggle (CSS custom properties, respects OS preference)
- [x] Responsive single-panel layout for mobile

### 1.2 Data Model & Storage (`storage.js`)
- [x] Project JSON schema: `Project`, `Document`, `Settings`
- [x] `createProject()`, `loadProject()`, `saveProject()` functions
- [x] `createDocument()`, `updateDocument()`, `deleteDocument()` functions
- [x] Debounced autosave to `localStorage` on every edit
- [x] Load project on page open; handle empty state

### 1.3 Binder (`binder.js`)
- [x] Hierarchical document tree from project JSON
- [x] Add document / add folder; inline rename on double-click
- [x] Soft-delete to Trash with confirmation
- [x] Drag-and-drop reorder using Sortable.js
- [x] Expand / collapse folders; persist state in localStorage
- [x] SVG icons for folder vs scene vs trash

### 1.4 Editor (`editor.js`)
- [x] `contenteditable` rich text area with formatting toolbar
- [x] Bold, italic, underline, strikethrough + keyboard shortcuts
- [x] Heading styles H1–H3, paragraph
- [x] Live word count in status bar
- [x] Typewriter / focus mode: blur paragraphs above and below cursor
- [x] Load selected document; autosave on switch

### 1.5 Export
- [x] Export as `.txt` (Blob download)
- [x] Export as `.md` (HTML → Markdown conversion)
- [x] Export as `.docx` (html-docx-js via CDN)
- [x] Export as `.doc` (RTF format, opened natively by Word)

---

## Phase 2 — The Corkboard & Structure _(Weeks 4–6)_

**Goal:** Visual planning tools that let writers see and reorganise their manuscript without opening every document.

### 2.1 Corkboard (`corkboard.js`)
- [ ] CSS Grid index-card layout for all scenes in the selected folder
- [ ] Each card: title, synopsis (editable inline), word count badge
- [ ] Colour label strip across the top of each card
- [ ] Drag-and-drop reorder; sync order back to binder tree
- [ ] Click card to open scene in editor
- [ ] Card zoom slider (CSS variable for card width)

### 2.2 Outline View (`outline.js`)
- [ ] Table layout: title, synopsis, status, word count, label columns
- [ ] Collapsible folder rows
- [ ] Inline synopsis editing (click cell to edit)
- [ ] Status dropdown: Not Started / Draft / Revised / Final
- [ ] Target word count column with progress bar

### 2.3 Inspector Panel (`inspector.js`)
- [ ] Document tab: title, synopsis, status, label, POV, location, keywords
- [ ] Project tab: author, title, genre, total word count, deadline
- [ ] All fields save back to the document JSON on change

### 2.4 Writing Targets
- [ ] Per-document target word count with progress bar in inspector
- [ ] Project-level target in status bar
- [ ] Deadline mode: words-per-day calculation
- [ ] Writing session timer; daily word count tracker with streak

### 2.5 Project Notes Panel
- [ ] Freeform notes (world-building, research) separate from the binder
- [ ] Persisted under a `notes` key in the project JSON
- [ ] Uses the same editor component (bold, italic, headings)

---

## Phase 3 — AI Writing Assistant _(Weeks 7–10)_

**Goal:** A Claude-powered sidebar that acts as an intelligent creative partner. No backend — the user supplies their own Anthropic API key.

### 3.1 API Key Setup
- [ ] Settings panel with API key input
- [ ] Store key in `localStorage` with a local-storage warning
- [ ] Validate key on entry with a test request; show status indicator
- [ ] Clear key button

### 3.2 Ask Claude Sidebar (`ai.js`)
- [ ] Collapsible sidebar: prompt input and streaming response display
- [ ] Send selected text + surrounding paragraph as context
- [ ] Insert response at cursor; copy to clipboard
- [ ] Token count estimate before sending

### 3.3 Prompt Templates
- [ ] Scene brainstorming: "Give me 5 ways this scene could go differently"
- [ ] Prose polish: rewrite in tighter prose / different tone / simpler language
- [ ] Continue writing: generate next 200 words in the author's style
- [ ] Character voice check: compare dialogue against character profile notes
- [ ] Plot summary: summarise full manuscript chapter by chapter
- [ ] Name generator: genre-appropriate characters and places

### 3.4 Context Management
- [ ] Include active document title + synopsis in every request
- [ ] Option to include the full project synopsis for plot-level requests
- [ ] Configurable context window (include N previous scenes)

---

## Phase 4 — Export, Import & Distribution _(Weeks 11–14)_

**Goal:** Writers can move their work in and out of Zero Pro in every format they need, and the app is ready for broader distribution.

### 4.1 Import (`import.js`)
- [ ] Import `.txt` — preserves paragraph breaks
- [ ] Import `.md` — converts headings to scene/chapter structure
- [ ] Import `.docx` / `.doc` — via mammoth.js (~40KB)
- [ ] Import from Google Docs — clipboard paste flow (DOMPurify sanitise)
- [ ] Paste-and-split: split pasted text into scenes on a delimiter
- [ ] Import entire project from `.zeropro` JSON backup

### 4.2 Full Compile & Export
- [ ] Compile settings UI: include/exclude documents, separator style
- [ ] Front matter template: title page with author, title, word count
- [ ] Export compiled manuscript as `.txt`, `.md`, `.docx`, `.doc`
- [ ] Export as PDF via CSS `@media print` stylesheet (submission format)
- [ ] Export as self-contained HTML file
- [ ] Export to Google Docs — rich HTML clipboard + URL scheme
- [ ] Export entire project as `.zeropro` JSON backup

### 4.3 Themes & Polish
- [ ] Typeface selector: Georgia (serif), Arial (sans), Courier (mono)
- [ ] Font size and line height sliders (CSS variables)
- [ ] Sepia / warm paper theme
- [ ] Service worker for full offline caching
- [ ] Multiple project workspaces

### 4.4 Distribution
- [ ] iOS App Store: WKWebView wrapper in Xcode
- [ ] Optional Pro tier backend: Supabase or Cloudflare Workers
- [ ] Ko-fi / Buy Me a Coffee in the app footer
- [ ] In-app changelog and version display

---

## Phase 5 — Kindle & Publishing Support _(Weeks 15–17)_ ✅

**Goal:** Writers can go directly from Zero Pro to publishing on Amazon KDP, IngramSpark, or self-publishing platforms without needing a separate tool.

### 5.1 EPUB Export (`publish.js`)
- [x] Package the compiled manuscript as a valid EPUB 3 file client-side (JSZip-based ZIP builder)
- [x] Embed table of contents (nav.xhtml + toc.ncx), chapter metadata, and stylesheet
- [x] EPUB 2 toc.ncx included for Kindle / older reader compatibility
- [ ] Preview EPUB in-browser before download _(deferred to Phase 9 — requires epub.js)_

### 5.2 Kindle Export
- [x] EPUB output is an EPUB 2-compatible subset accepted directly by Amazon KDP
- [x] KDP Wizard with step-by-step upload checklist and EPUB or .docx export
- [x] KDP formatting checklist embedded in the wizard modal
- [x] KDP-formatted .docx with title page, copyright page, chapter breaks, Georgian body font

### 5.3 Publishing Help Modals
- [x] **KDP Wizard** — exports EPUB or .docx with KDP-standard fonts, margins, indents, front matter
- [x] **IngramSpark Wizard** — trim size / font picker, ISBN field, POD checklist, exports interior .docx
- [x] **Submission Formatter** — 12pt Times, double-spaced, 1" margins, running header, title-page word count
- [x] **Self-Publishing Checklist** — 6-section interactive checklist: editing, cover, ISBNs, metadata, distribution, launch
- [x] **Genre Style Guides** — tabbed modals for Romance, Thriller, Literary Fiction, Non-Fiction

### 5.4 Front & Back Matter Templates
- [x] Title page, copyright page, dedication, epigraph, acknowledgements templates
- [x] "Also by this author" back matter template
- [x] Author bio template
- [x] All templates insert as editable binder documents

---

## Phase 6 — Image Import & Media Support _(Weeks 18–19)_ ✅

**Goal:** Writers can include images in their documents — useful for non-fiction, illustrated novels, and research notes.

### 6.1 Image Import (`media.js`)
- [x] Drag-and-drop images into the editor (JPEG, PNG, WebP, GIF)
- [x] Click-to-insert via file picker button in the editor toolbar
- [x] Paste images from clipboard (screenshots, copied web images)
- [x] Images stored as base64 data URLs in the document JSON
- [x] Warn when a document exceeds 5MB due to embedded images

### 6.2 Image Management in Editor
- [x] Click image to show floating toolbar with size presets (S/M/L/Full)
- [x] Set image alignment: inline / float-left / float-right / centred
- [x] Add alt-text for accessibility and EPUB metadata
- [x] Delete image with the Delete key when selected
- [x] Images stripped from plain-text and Markdown export; preserved in HTML, EPUB, DOCX

### 6.3 Research Image Binder Items
- [x] New binder item type: `image` — stores a single image with a caption
- [x] Image items display in a lightbox when clicked from the binder
- [x] Drag an image binder item into the editor to embed it
- [x] "Insert in Editor" context menu option for image binder items
- [x] Research folder: auto-created grouping for image and web-clipping items

### 6.4 Web Clipping (Basic)
- [x] Paste a URL → fetch page title and a text snippet (CORS-permitting)
- [x] Store clippings as research binder items with source URL
- [x] Clippings are never compiled into the manuscript
- [x] Clip button in binder header for quick URL clipping

---

## Phase 7 — Nice-to-Haves & UI Polish _(Weeks 20–22)_ ✅

**Goal:** Elevate Zero Pro from functional to delightful by shipping all the quality-of-life and "Nice to Have" items from the feature spec.

### 7.1 Editor Polish
- [x] Find & Replace panel — regex-capable, search within the open document
- [x] Full project search — search across all documents (Ctrl+Shift+F), jump to result
- [x] Revision history / snapshots — named point-in-time saves per document
- [x] Snapshot diff view — side-by-side colour-coded LCS comparison
- [x] Format paint — copy inline styles from one selection to another (toolbar button)
- [x] Spellcheck language selector (sets `lang` attribute for browser native spellcheck)

### 7.2 Binder Polish
- [x] Colour-coded labels — pick from a palette, show as dot on binder row
- [x] Duplicate document — clone with new ID, append "Copy" to title
- [x] Multi-select — Shift+click to select multiple, bulk label and bulk trash
- [x] Right-click context menu — rename, duplicate, label, delete

### 7.3 Corkboard Polish
- [x] Card zoom slider — CSS variable for card width
- [x] Split corkboard — show two folders side-by-side with folder picker
- [x] Status indicator on each card — draft / revised / final dot

### 7.4 Ambient & Atmosphere
- [x] Ambient sound player: rain, café, white noise, fireplace, wind (Web Audio API, procedural)
- [x] Custom accent colour (HSL hue slider in Settings → Appearance)
- [x] Writing streak calendar — GitHub-style 6-month heatmap, streak stats

### 7.5 Command Palette
- [x] `Ctrl/Cmd+K` command palette — fuzzy-search any action or document
- [x] Recent documents section
- [x] Actions: new document, toggle theme, export, open settings, snapshots, ambient, streak

---

## Phase 8 — Cloud Sync & Real-Time Collaboration _(Weeks 23–26)_

**Goal:** Give writers a way to access their projects on any device and collaborate with co-authors or editors in real time — the most-requested gap vs. Scrivener.

### 8.1 Native Cloud Sync (`sync.js`)
- [ ] Optional account system (Supabase Auth — email + magic link, no password required)
- [ ] Projects stored in Supabase Postgres; sync on every save (debounced)
- [ ] Conflict resolution: last-write-wins with a "merge conflict" modal for manual resolution
- [ ] Sync status indicator in the toolbar (synced / syncing / offline)
- [ ] iCloud Drive integration via File System Access API (iOS Safari / macOS)
- [ ] Google Drive integration via Google Drive Picker API (optional)

### 8.2 Offline-First Architecture
- [ ] Service worker caches all app assets on first load
- [ ] IndexedDB as offline queue — writes accumulate offline, flush on reconnect
- [ ] Visual indicator when operating offline
- [ ] No data loss if the browser closes while offline

### 8.3 Real-Time Collaboration (`collab.js`)
- [ ] Share a project via a URL containing a room token
- [ ] Live cursor presence: see collaborator names and cursor positions
- [ ] Operational Transform (OT) or CRDT conflict resolution (use Yjs — ~70KB)
- [ ] Collaborator permission levels: Owner / Editor / Commenter / Viewer
- [ ] In-document comments tied to a specific text range (like Google Docs)
- [ ] Typing presence indicator ("Aisha is writing…") in the status bar

### 8.4 Android & Progressive Web App (PWA)
- [ ] Full PWA manifest: installable on Android home screen from Chrome
- [ ] Service worker + cache strategy for app shell + project data
- [ ] Touch-optimised gestures: swipe left/right to switch panels
- [ ] Tested on Samsung Galaxy, Pixel, and Chrome on Chromebook

---

## Phase 9 — UX Modernisation _(Weeks 27–30)_

**Goal:** Close the UX gaps that make Scrivener frustrating — simplified compile, unified settings, better theming, and first-class support for Markdown writers.

### 9.1 Simplified Compile Wizard
- [ ] "One-Click Publish" presets: KDP Novel, Print-on-Demand, Agent Submission, Web Article
- [ ] WYSIWYG compile preview: see exactly what the output will look like before downloading
- [ ] Step-by-step wizard UI instead of the raw settings panel
- [ ] Save custom compile presets by name

### 9.2 Centralised Settings
- [ ] Settings modal with a search bar — type to find any preference
- [ ] Sections: Editor · Binder · Themes · Export · Sync · AI · Account
- [ ] All settings stored in the project JSON `settings` key + a global user preferences key
- [ ] Import / export settings as a JSON file (for use across devices)

### 9.3 Advanced Theming
- [ ] Per-panel background colour control (binder, editor, inspector independently)
- [ ] Custom UI icon pack support (swap SVG icon set via a settings JSON)
- [ ] Sidebar colour palette: change binder/inspector background independently of editor
- [ ] "Pure dark" mode — true `#000000` for OLED screens
- [ ] Font pairing: choose separate fonts for UI chrome and editor body

### 9.4 Native Markdown Mode
- [ ] Toggle per-document between Rich Text mode and Markdown mode
- [ ] Live preview: left pane shows Markdown source, right pane shows rendered output
- [ ] Markdown documents stored as plain text in the JSON (not HTML)
- [ ] Syntax highlighting for Markdown source (Prism.js or a lightweight equivalent)
- [ ] Export Markdown documents with no conversion needed

---

## Phase 10 — Advanced Writing & Editing Tools _(Weeks 31–34)_

**Goal:** Bring research, annotation, and grammar tools inside the app so writers never have to leave to use ProWritingAid, PDF viewers, or separate note-taking apps.

### 10.1 AI Grammar & Style Assistant
- [ ] Grammar and style checking via Claude API (user's own key)
- [ ] Inline underlines for grammar errors, style suggestions, and pacing issues
- [ ] "Explain this suggestion" — Claude explains why a change is recommended
- [ ] Tone analyser: detect dominant tone per scene (tense / relaxed / humorous / dark)
- [ ] Readability score (Flesch-Kincaid) displayed in inspector
- [ ] Batch style-check: scan the entire manuscript and produce a report

### 10.2 PDF Annotation (Research Documents)
- [ ] Import PDF research files into the binder as `pdf` items
- [ ] Render PDFs in-browser using PDF.js (open source, ~300KB)
- [ ] Highlight passages with colour-coded highlights
- [ ] Attach margin notes / sticky notes to highlighted passages
- [ ] Annotations stored in the project JSON alongside the PDF reference
- [ ] Annotated PDFs viewable in the inspector alongside the active document

### 10.3 Global Snapshot Search
- [ ] Search across all snapshots in the project for a string
- [ ] Results show: document name, snapshot name, date, matching line in context
- [ ] Restore a single paragraph from a snapshot without replacing the whole document
- [ ] Snapshot browser: browse all versions of a document with dates and word counts

### 10.4 Visual Timeline View (`timeline.js`)
- [ ] Horizontal timeline that maps scenes based on a date/time field in metadata
- [ ] Drag scenes along the timeline to reorder them chronologically
- [ ] Multiple character tracks: see POV character scenes as coloured lanes
- [ ] Scene duration visualised as card width (set via a "duration" metadata field)
- [ ] Toggle between story order and chronological order

---

## Phase 11 — Quality of Life & Power Features _(Weeks 35–38)_

**Goal:** Final polish, power-user tools, and the features that make writers feel like Zero Pro was built specifically for them.

### 11.1 Writing Statistics Dashboard
- [ ] Historical word count graph: daily / weekly / monthly (stored in localStorage)
- [ ] Longest writing streak and current streak
- [ ] Per-project writing velocity: average words per session
- [ ] Export statistics as a CSV

### 11.2 Cross-Device & Cross-Platform Experience
- [ ] Unified sync account — write on iPhone, continue on desktop, same state
- [ ] Optimised iPhone Safari layout: tap binder icon to slide in, full-screen editor
- [ ] Keyboard shortcut reference panel (Ctrl/Cmd+?)
- [ ] Customisable keyboard shortcuts (store overrides in settings JSON)

### 11.3 Automation & Scripting (Power Users)
- [ ] Zapier / Make webhook triggers: "on project save", "on target reached"
- [ ] Export trigger: auto-export to a Dropbox or Google Drive folder on save (via their APIs)
- [ ] Custom prompt library: save and reuse personal Claude prompt templates
- [ ] Batch rename scenes using a pattern (e.g. "Chapter {n} — {title}")

### 11.4 Accessibility & Internationalisation
- [ ] Full keyboard navigation audit — every action reachable without a mouse
- [ ] Screen reader testing pass (NVDA + VoiceOver)
- [ ] ARIA live regions for dynamic content (word count, sync status)
- [ ] RTL language support (Arabic, Hebrew) via `dir="rtl"` on the editor
- [ ] UI string externalisation into `strings.js` for future translation
- [ ] High-contrast mode (WCAG AA compliant)

---

## Claude Code Build Order

| Session | Focus |
|---|---|
| 1–2 | HTML shell, CSS layout, data model ✅ |
| 3–4 | Binder tree, rich text editor ✅ |
| 5 | Word count, focus mode, export (.txt .md .docx .doc) ✅ |
| 6 | Corkboard — card grid, drag to reorder, colour labels |
| 7 | Outline view — table layout, inline editing |
| 8 | Inspector panel — metadata, synopsis, status, targets |
| 9 | Claude API sidebar, prompt templates |
| 10 | Import (mammoth.js), compile, full export pipeline |
| 11 | EPUB + Kindle export, publishing help modals ✅ |
| 12 | Image import, base64 storage, editor embed ✅ |
| 13 | Nice-to-haves: find/replace, snapshots, command palette ✅ |
| 14 | Cloud sync (Supabase), offline queue (IndexedDB) |
| 15 | Real-time collaboration (Yjs) |
| 16 | PWA manifest, Android testing |
| 17 | Compile wizard, settings search, advanced theming |
| 18 | Native Markdown mode with live preview |
| 19 | Grammar/style AI, PDF annotation (PDF.js) |
| 20 | Timeline view, snapshot search, statistics dashboard |

---

## Post-Launch Backlog

- **Fountain / Final Draft support** — screenplay formatting mode
- **Plugin API** — third-party extensions for binder item types and export formats
- **Text-to-speech** — read back the current document using the Web Speech API
- **Writing prompts** — built-in prompt generator for writer's block
- **Zapier integration** — trigger automations on project events
- **Universal cross-platform licence** — one account, all platforms

---

## Contributing

Open an issue with the `roadmap` label to suggest new features or vote on existing ones. Bug reports and pull requests are welcome at any phase.
