# Zero Pro — Feature Specification

Zero Pro is a browser-based writing suite for novelists. All features run entirely in the browser with no account required for core functionality. Data is stored locally on the writer's device by default.

Priority levels: **Must Have** · **Should Have** · **Nice to Have**
Complexity levels: **Low** · **Medium** · **High**

---

## 3.1 Editor

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Rich text editing | Must Have | 1 | Medium | `contenteditable` with custom toolbar — no heavy dependencies needed |
| Bold / Italic / Underline | Must Have | 1 | Low | Standard `execCommand` or Selection API |
| Heading styles (H1–H3) | Must Have | 1 | Low | Chapter title, scene heading, body text hierarchy |
| Paragraph indent (first line) | Must Have | 1 | Low | CSS class toggle — standard manuscript format |
| Word count (live) | Must Have | 1 | Low | Count on `input` event, display in status bar |
| Typewriter / Focus mode | Must Have | 1 | Low | Blur paragraphs above/below cursor with CSS |
| Autosave to localStorage | Must Have | 1 | Low | Debounced save on every keystroke |
| Find & Replace | Should Have | 7 | Medium | Regex-capable search across the open document |
| Full manuscript search | Should Have | 7 | High | Search across all documents in the project |
| Spellcheck | Should Have | 2 | Low | Browser native `spellcheck` attribute — free |
| Revision history / snapshots | Should Have | 7 | High | Named point-in-time saves per document in localStorage |
| Snapshot diff view | Should Have | 7 | High | Side-by-side colour-coded comparison of two snapshots |
| Global snapshot search | Should Have | 10 | High | Search across all snapshots for deleted text |
| Format paint | Nice to Have | 7 | Low | Copy inline styles from one selection to another |
| Typeface / size selector | Nice to Have | 4 | Low | System fonts only to avoid loading overhead |
| Native Markdown mode | Nice to Have | 9 | Medium | Per-document toggle; live preview split-pane; stored as plain text |

---

## 3.2 Binder (Project Structure)

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Hierarchical document tree | Must Have | 1 | Medium | Parts > Chapters > Scenes, stored as JSON flat array with parentId |
| Add / rename / delete items | Must Have | 1 | Low | Toolbar buttons; inline rename on double-click |
| Drag to reorder | Must Have | 1 | Medium | Sortable.js — drag within and between folders |
| Expand / collapse folders | Must Have | 1 | Low | Toggle arrow icon; state persisted in localStorage |
| Document icons (folder vs scene) | Must Have | 1 | Low | SVG icons — cosmetic but important for clarity |
| Trash / recycle bin | Should Have | 1 | Medium | Soft delete; permanent purge from Trash |
| Colour-coded labels | Should Have | 7 | Low | Per-item label dot; palette picker in inspector |
| Duplicate document | Should Have | 7 | Low | Clone node with new ID; append "Copy" to title |
| Right-click context menu | Should Have | 7 | Low | Rename, duplicate, label, delete |
| Multi-select for bulk move | Nice to Have | 7 | High | Shift+click selection, then drag as a group |
| Image binder items | Nice to Have | 6 | Medium | New type: `image` — stores a single image with caption |
| Research folder type | Nice to Have | 6 | Low | Dedicated grouping for images and web clippings |

---

## 3.3 Corkboard

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Index card grid view | Must Have | 2 | Medium | CSS Grid — each card is a scene document |
| Card shows title + synopsis | Must Have | 2 | Low | Read from document metadata, editable inline |
| Drag to reorder cards | Must Have | 2 | Medium | Reorder reflects in the binder tree |
| Colour label on card | Must Have | 2 | Low | Coloured strip across top of card |
| Click card to open in editor | Must Have | 2 | Low | Navigate to scene, update editor panel |
| Card word count badge | Should Have | 2 | Low | Small pill showing scene word count |
| Status indicator (draft/revised/final) | Should Have | 7 | Low | Dot or badge — configurable per card |
| Zoom in/out card size | Nice to Have | 7 | Low | CSS variable for card width, slider control |
| Split corkboard (horizontal/vertical) | Nice to Have | 7 | High | Show two folders side-by-side — powerful but complex |

---

## 3.4 Outline View

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Collapsible tree with synopses | Must Have | 2 | Medium | Table layout — title left, synopsis right |
| Inline synopsis editing | Must Have | 2 | Low | Click synopsis cell to edit in place |
| Status column | Should Have | 2 | Low | Dropdown: Not Started / Draft / Revised / Final |
| Word count column | Should Have | 2 | Low | Per-row word count pulled from document |
| Target word count column | Should Have | 2 | Low | Set per scene, show progress bar |
| Label column | Should Have | 2 | Low | Colour dot — same label system as corkboard |
| POV character column | Nice to Have | 2 | Low | Tag field, useful for novels with multiple POVs |

---

## 3.5 AI Writing Assistant _(Phase 3)_

Powered by the Anthropic Claude API. The user provides their own API key — stored in localStorage. No backend required.

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Claude API integration | Must Have | 3 | Medium | User provides own API key, stored in localStorage |
| Context-aware suggestions | Must Have | 3 | High | Send selected text + surrounding paragraphs as context |
| Scene brainstorming mode | Must Have | 3 | Medium | Prompt template: generate alternatives for selected scene |
| Prose polish / rewrite | Must Have | 3 | Medium | Rewrite in tighter prose, different tone, or simpler language |
| Continue writing mode | Should Have | 3 | Medium | Claude writes next 200 words in the author's established style |
| Plot summary generator | Should Have | 3 | Medium | Summarise entire manuscript chapter by chapter |
| Name generator | Should Have | 3 | Low | Genre-appropriate names for characters and places |
| Character voice checker | Should Have | 3 | High | Compare dialogue against character profile notes |
| Plot hole detector | Nice to Have | 3 | High | Requires full context window — worth adding in v2 |
| AI grammar & style checking | Should Have | 10 | High | Inline underlines for grammar errors and style suggestions |
| Tone analyzer | Nice to Have | 10 | Medium | Detect dominant tone per scene via Claude |
| Readability score | Nice to Have | 10 | Low | Flesch-Kincaid score displayed in inspector |
| Batch style-check report | Nice to Have | 10 | High | Scan entire manuscript; produce a style report |
| Custom prompt library | Nice to Have | 11 | Low | Save and reuse personal Claude prompt templates |

---

## 3.6 Export & Sharing

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Export as plain text (.txt) | Must Have | 1 | Low | Blob download |
| Export as Markdown (.md) | Must Have | 1 | Low | Strip HTML, convert to Markdown |
| Export as .docx | Must Have | 1 | Medium | html-docx-js via CDN |
| Export as .doc | Must Have | 1 | Medium | RTF format — Word opens natively |
| Export project as JSON backup | Must Have | 4 | Low | Serialise entire localStorage project |
| Import project from JSON | Must Have | 4 | Low | Restore from backup file |
| Import .txt / .md | Must Have | 4 | Low | Preserve structure; convert headings to scenes |
| Import .docx / .doc | Must Have | 4 | Medium | mammoth.js — extract text + basic formatting |
| Import from Google Docs | Should Have | 4 | Medium | Paste-from-clipboard; DOMPurify sanitise |
| Paste-and-split | Should Have | 4 | Low | Split pasted text into scenes on a delimiter |
| Export as formatted HTML | Should Have | 4 | Medium | Self-contained HTML file, inline styles |
| Manuscript PDF | Should Have | 4 | Medium | CSS `@media print` — standard submission format |
| Export to Google Docs | Should Have | 4 | Medium | Rich HTML clipboard + URL scheme |
| Full compile pipeline | Must Have | 4 | High | Include/exclude docs, separators, front matter, preview |
| EPUB export | Must Have | 5 | High | Valid EPUB 3; embed cover, TOC, chapter metadata |
| Kindle (.mobi-compatible) export | Must Have | 5 | High | EPUB 2 subset accepted by Amazon KDP |
| Export statistics as CSV | Nice to Have | 11 | Low | Writing history export |

---

## 3.7 Publishing & Kindle Support _(Phase 5)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| KDP formatting wizard | Must Have | 5 | Medium | One-click format to Amazon KDP standards: fonts, margins, drop-caps, chapter breaks |
| IngramSpark wizard | Must Have | 5 | Medium | Print-on-demand: bleed, trim size, page numbers, ISBN placeholder |
| Literary agent submission formatter | Must Have | 5 | Low | 12pt Times, double-spaced, 1" margins, running header |
| Self-publishing checklist modal | Should Have | 5 | Low | Interactive checklist: editing, cover, ISBN, distribution, pricing |
| Genre style guide modals | Should Have | 5 | Low | Quick-reference: Romance, Thriller, Literary Fiction, Non-fiction conventions |
| Front matter templates | Should Have | 5 | Low | Title page, copyright, dedication, acknowledgements, "Also by" |
| Back matter templates | Should Have | 5 | Low | Author bio, preview chapter, social links |
| EPUB in-browser preview | Should Have | 5 | High | Preview EPUB output before download |
| KDP checklist | Should Have | 5 | Low | Font requirements, chapter breaks, front/back matter checklist |
| Cover page template generator | Nice to Have | 5 | Medium | Generate a KDP-ready cover page based on project metadata |

---

## 3.8 Image Import & Media Support _(Phase 6)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Drag-and-drop images into editor | Must Have | 6 | Medium | JPEG, PNG, WebP, GIF — stored as base64 data URLs |
| Click-to-insert image via file picker | Must Have | 6 | Low | Button in editor toolbar |
| Paste image from clipboard | Should Have | 6 | Low | Screenshots, copied web images |
| Image resize in editor | Should Have | 6 | Medium | CSS resize or drag corners |
| Image alignment controls | Should Have | 6 | Low | Inline / float-left / float-right / centred |
| Alt-text field | Should Have | 6 | Low | For accessibility and EPUB metadata |
| Large document size warning | Should Have | 6 | Low | Warn at >5MB due to base64 images |
| Image binder item type | Should Have | 6 | Medium | `image` type — stored in binder with caption; lightbox on click |
| Drag image from binder into editor | Should Have | 6 | Medium | Embed from research into manuscript |
| Web clipping (basic) | Nice to Have | 6 | Medium | Paste URL → fetch title + snippet; store as research item |
| Images stripped from .txt export | Must Have | 6 | Low | Plain text export ignores images |
| Images preserved in HTML/EPUB/DOCX export | Must Have | 6 | Medium | Re-encode from base64 into export format |

---

## 3.9 Cloud Sync & Collaboration _(Phase 8)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Optional account (Supabase Auth) | Must Have | 8 | Medium | Email + magic link — no password required |
| Cloud project sync | Must Have | 8 | High | Projects stored in Supabase Postgres; sync on every save |
| Conflict resolution modal | Must Have | 8 | High | Last-write-wins with manual merge option |
| Sync status toolbar indicator | Must Have | 8 | Low | Synced / Syncing / Offline states |
| iCloud Drive via File System Access API | Should Have | 8 | Medium | Works on iOS Safari and macOS |
| Google Drive Picker integration | Should Have | 8 | High | Optional — save/open from Google Drive |
| Offline-first with IndexedDB queue | Must Have | 8 | High | Writes queue offline; flush on reconnect |
| Service worker asset caching | Must Have | 8 | Medium | Full offline functionality after first load |
| Real-time collaboration (Yjs CRDT) | Should Have | 8 | High | Live editing with operational transform conflict resolution |
| Collaborator cursor presence | Should Have | 8 | High | See collaborator names and cursor positions |
| Permission levels | Should Have | 8 | Medium | Owner / Editor / Commenter / Viewer |
| Inline comments (collaborative) | Should Have | 8 | High | Comments tied to a specific text range |
| Typing presence indicator | Nice to Have | 8 | Low | "Aisha is writing…" in the status bar |
| Share via room token URL | Should Have | 8 | Medium | Share a project via a URL with an embedded room token |

---

## 3.10 UX Modernisation _(Phase 9)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| One-click compile presets | Must Have | 9 | Medium | KDP Novel / Print-on-Demand / Agent Submission / Web Article |
| WYSIWYG compile preview | Must Have | 9 | High | See the output before downloading |
| Compile wizard (step-by-step UI) | Must Have | 9 | Medium | Replaces the raw settings panel |
| Save custom compile presets | Should Have | 9 | Low | Store preset JSON by name |
| Settings search bar | Must Have | 9 | Medium | Type to find any preference — Scrivener's biggest UX gap |
| Centralised settings modal | Must Have | 9 | Medium | Sections: Editor / Binder / Themes / Export / Sync / AI / Account |
| Import / export settings JSON | Should Have | 9 | Low | Transfer settings across devices |
| Per-panel background colour | Should Have | 9 | Low | Binder, editor, inspector independently configurable |
| Custom SVG icon pack | Nice to Have | 9 | Medium | Swap icon set via a settings JSON |
| Pure dark mode (#000000) | Should Have | 9 | Low | For OLED screens |
| Font pairing (UI vs editor) | Should Have | 9 | Low | Separate font choices for chrome and body text |
| Android PWA support | Must Have | 9 | High | Installable on Android home screen from Chrome |
| Touch gesture navigation | Must Have | 9 | Medium | Swipe left/right to switch panels on mobile |

---

## 3.11 Advanced Writing Tools _(Phase 10)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| PDF import into binder | Must Have | 10 | Medium | New `pdf` item type; render with PDF.js (~300KB) |
| PDF annotation (highlights) | Must Have | 10 | High | Colour-coded highlights on PDF pages |
| PDF margin notes | Should Have | 10 | High | Sticky notes attached to highlighted passages |
| Annotations stored in project JSON | Must Have | 10 | Medium | Alongside PDF reference; not embedded binary |
| Visual timeline (`timeline.js`) | Must Have | 10 | High | Horizontal timeline mapped to scene date/time metadata |
| Timeline drag-to-reorder | Should Have | 10 | High | Drag scenes along the timeline chronologically |
| Character POV lanes | Should Have | 10 | Medium | Colour-coded lanes per POV character |
| Story order vs chronological toggle | Should Have | 10 | Low | Switch timeline between narrative and real-world order |
| Global snapshot search | Must Have | 10 | High | Search deleted text across all snapshots |
| Restore single paragraph from snapshot | Should Have | 10 | High | Granular restore without replacing the whole document |
| Snapshot browser | Should Have | 10 | Medium | Browse all versions with dates and word counts |

---

## 3.12 Quality of Life & Power Features _(Phase 11)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Writing statistics dashboard | Must Have | 11 | Medium | Daily/weekly/monthly word count graph (localStorage) |
| Writing streak calendar | Should Have | 11 | Low | Local streak — no backend required |
| Customisable keyboard shortcuts | Should Have | 11 | Medium | Store overrides in settings JSON |
| Keyboard shortcut reference panel | Must Have | 11 | Low | Ctrl/Cmd+? overlay |
| RTL language support | Should Have | 11 | Medium | `dir="rtl"` on editor for Arabic, Hebrew |
| High-contrast mode | Should Have | 11 | Low | WCAG AA compliant |
| Screen reader testing | Must Have | 11 | High | NVDA + VoiceOver pass |
| ARIA live regions | Must Have | 11 | Low | Word count, sync status — dynamic content announced |
| UI string externalisation | Should Have | 11 | Medium | All strings in `strings.js` for future translation |
| Batch scene rename | Nice to Have | 11 | Low | Pattern: "Chapter {n} — {title}" |
| Zapier / Make webhook triggers | Nice to Have | 11 | High | "On save", "on target reached" |
| Auto-export to Dropbox / Google Drive | Nice to Have | 11 | High | On save, via their respective APIs |

---

## 3.13 UI, Themes & Settings

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Dark mode / Light mode | Must Have | 1 | Low | CSS custom properties, system preference detection |
| Three-panel layout (Binder/Editor/Inspector) | Must Have | 1 | Medium | CSS Grid with collapsible panels |
| Collapsible panels | Must Have | 1 | Low | Toggle buttons, CSS transition |
| Responsive / mobile layout | Must Have | 1 | Medium | Single panel on mobile, swipe to navigate |
| Typeface selector (serif/sans/mono) | Should Have | 4 | Low | System fonts — Georgia, Arial, Courier |
| Font size control | Should Have | 4 | Low | CSS variable, slider or +/– buttons |
| Line spacing control | Should Have | 4 | Low | 1.5 / 2.0 / custom — CSS `line-height` variable |
| Sepia / warm paper theme | Should Have | 4 | Low | Additional theme option |
| Custom accent colour | Nice to Have | 7 | Low | HSL hue slider — single CSS variable |
| Ambient sound player | Nice to Have | 7 | Medium | Rain, café, white noise, fireplace (Web Audio API) |
| Command palette (Ctrl/Cmd+K) | Should Have | 7 | Medium | Fuzzy-search any action or document |
| Per-panel background colour | Nice to Have | 9 | Low | Binder, editor, inspector independently |
| Pure dark mode | Nice to Have | 9 | Low | True `#000000` for OLED |
| Custom icon packs | Nice to Have | 9 | Medium | Swap SVG icon set via settings JSON |

---

## 3.14 Story Planning & Smart Templates _(Phase 12)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Character Database | Must Have | 12 | Medium | Two-pane modal; stored as `project.characters[]` in project JSON |
| Character fields | Must Have | 12 | Low | Name, role, age, description, appearance, arc summary, notes |
| Character avatar initials | Should Have | 12 | Low | Auto-generated from name; coloured by first letter |
| Character search & filter | Should Have | 12 | Low | Real-time filter on the character list |
| Wiki-style cross-document links | Must Have | 12 | Medium | Type `[[` in editor to get autocomplete of all doc titles |
| Wiki-link autocomplete dropdown | Must Have | 12 | Medium | Keyboard navigation ↑/↓/Enter/Esc; positioned at caret |
| Wiki-link click-to-navigate | Must Have | 12 | Low | Clicking a rendered `[[link]]` navigates to that document |
| Plot Structure Templates | Must Have | 12 | Medium | Three-Act, Hero's Journey (12), Save the Cat (15), Freytag's Pyramid |
| Plot template preview | Should Have | 12 | Low | List all stages before applying |
| Plot template apply | Must Have | 12 | Medium | Creates a binder folder + one doc per stage, synopsis pre-filled |
| New Project from Template wizard | Must Have | 12 | Medium | Novel, Short Story, Non-Fiction, Personal Journal, Screenplay |
| Template binder preview | Should Have | 12 | Low | Shows folder/doc tree before creating the project |
| Template project title input | Should Have | 12 | Low | Custom name for the new project |

---

## 3.15 Focus, Sessions & Smart Editing _(Phase 13)_

| Feature | Priority | Phase | Complexity | Notes |
|---|---|---|---|---|
| Writing Sprint Timer | Must Have | 13 | Medium | Floating HUD with SVG countdown ring |
| Sprint presets | Should Have | 13 | Low | 5, 15, 25, 45 minute quick-select |
| Sprint live stats | Should Have | 13 | Low | Real-time words written and WPM during session |
| Sprint result card | Should Have | 13 | Low | Emoji, words, WPM, personal-best comparison on completion |
| Sprint session history | Nice to Have | 13 | Low | Last 50 sessions in `localStorage['zp_sprints']` |
| Personal best tracking | Should Have | 13 | Low | `localStorage['zp_sprint_best']` |
| Reading Mode | Must Have | 13 | Medium | Full-screen overlay, removes all chrome |
| Reading Mode: doc view | Must Have | 13 | Low | Renders the currently selected document |
| Reading Mode: manuscript view | Must Have | 13 | Medium | Concatenates all non-trashed docs in binder order |
| Reading Mode: font controls | Should Have | 13 | Low | Serif / Sans-serif / Monospace |
| Reading Mode: width controls | Should Have | 13 | Low | Normal / Narrow / Wide content column |
| Reading Mode: font size | Should Have | 13 | Low | Small → X-Large |
| Reading Mode: estimated read time | Should Have | 13 | Low | Calculated at 250 WPM |
| Reading Mode: print | Should Have | 13 | Low | `window.print()` — toolbar hidden with `@media print` |
| Smart Typography — curly quotes | Must Have | 13 | Medium | Context-aware `"→""`/`'→''`; integrates with browser undo |
| Smart Typography — em-dash | Must Have | 13 | Low | `--` → `—` on second hyphen key press |
| Smart Typography — ellipsis | Must Have | 13 | Low | `...` → `…` on third dot key press |
| Smart Typography: indicator toast | Should Have | 13 | Low | Shows replacement for 1.2 s; screen-reader aria-hidden |
| Split Editor | Must Have | 13 | Medium | Side-by-side CSS Grid in `#editor-pane.split-active` |
| Split Editor: reference doc picker | Must Have | 13 | Low | Dropdown lists all non-trashed docs |
| Split Editor: auto-refresh | Should Have | 13 | Low | Reference pane updates when `handleDocChange` fires |
| Split Editor: close button | Must Have | 13 | Low | Dismiss pane without a page reload |

---

## Data Model

All project data is stored as a single JSON object in `localStorage` (and optionally synced to Supabase from Phase 8):

```
Project
  id, title, createdAt, updatedAt, settings, labels[],
  characters[], documents[]

Document
  id, parentId, type (folder/doc/image/pdf), title, synopsis,
  content (HTML or plain text), wordCount, label, status,
  target, pov, location, keywords[], order, collapsed, inTrash,
  snapshots[], date, duration, imageData (base64), pdfRef,
  annotations[]

Character (project.characters[])
  id, name, role, age, description, appearance,
  arcSummary, notes, createdAt

Annotation (doc.annotations[])
  id, page, x, y, w, h, color, note

Settings
  theme, font, fontSize, lineHeight, apiKey, compilePreset,
  syncEnabled, userId, highContrast, editorRtl,
  smartQuotes, smartDashes

Snapshot
  id, name, content, wordCount, createdAt
```

### Libraries by Phase

| Library | Size | Phase | Purpose |
|---|---|---|---|
| Sortable.js | 4KB | 1 | Drag-and-drop binder and corkboard |
| html-docx-js | 15KB | 1 | HTML → .docx export |
| DOMPurify | 12KB | 4 | Sanitise pasted HTML |
| Marked.js | 22KB | 4 | Markdown export / Markdown preview |
| mammoth.js | 40KB | 4 | .docx / .doc → HTML import |
| epub.js / JSZip | ~80KB | 5 | EPUB 3 packaging |
| PDF.js | 300KB | 10 | In-browser PDF rendering and annotation |
| Yjs | 70KB | 8 | CRDT real-time collaboration |
| Prism.js | 8KB | 9 | Markdown syntax highlighting |
