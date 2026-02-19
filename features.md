# Zero Pro — Feature Specification

Zero Pro is a browser-based writing suite for novelists. All features run entirely in the browser with no account required. Data is stored locally on the writer's device.

Priority levels: **Must Have** · **Should Have** · **Nice to Have**
Complexity levels: **Low** · **Medium** · **High**

---

## 3.1 Editor

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Rich text editing | Must Have | Medium | `contenteditable` with custom toolbar — no heavy dependencies needed |
| Bold / Italic / Underline | Must Have | Low | Standard `execCommand` or Selection API |
| Heading styles (H1–H3) | Must Have | Low | Chapter title, scene heading, body text hierarchy |
| Paragraph indent (first line) | Must Have | Low | CSS class toggle — standard manuscript format |
| Word count (live) | Must Have | Low | Count on `input` event, display in status bar |
| Typewriter / Focus mode | Must Have | Low | Blur paragraphs above/below cursor with CSS |
| Autosave to localStorage | Must Have | Low | Debounced save on every keystroke |
| Find & Replace | Should Have | Medium | Regex-capable search across the open document |
| Full manuscript search | Should Have | High | Search across all documents in the project |
| Spellcheck | Should Have | Low | Browser native `spellcheck` attribute — free |
| Typeface / size selector | Nice to Have | Low | System fonts only to avoid loading overhead |
| Revision history | Nice to Have | High | localStorage snapshots — expensive to store, worth exploring |

---

## 3.2 Binder (Project Structure)

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Hierarchical document tree | Must Have | Medium | Parts > Chapters > Scenes, stored as JSON tree |
| Add / rename / delete items | Must Have | Low | Right-click context menu or toolbar buttons |
| Drag to reorder | Must Have | Medium | HTML5 drag-and-drop or Sortable.js |
| Expand / collapse folders | Must Have | Low | Toggle arrow icon, save state in localStorage |
| Document icons (folder vs scene) | Must Have | Low | SVG icons — cosmetic but important for clarity |
| Trash / recycle bin | Should Have | Medium | Soft delete — move to Trash folder before permanent removal |
| Duplicate document | Should Have | Low | Clone node with new ID |
| Colour-coded labels | Should Have | Low | Per-item label, visible as a dot on the binder row |
| Multi-select for bulk move | Nice to Have | High | Shift+click selection, then drag as group |

---

## 3.3 Corkboard

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Index card grid view | Must Have | Medium | CSS Grid — each card is a scene document |
| Card shows title + synopsis | Must Have | Low | Read from document metadata, editable inline |
| Drag to reorder cards | Must Have | Medium | Reorder reflects in the binder tree |
| Colour label on card | Must Have | Low | Coloured strip across top of card |
| Click card to open in editor | Must Have | Low | Navigate to scene, update editor panel |
| Card word count badge | Should Have | Low | Small pill showing scene word count |
| Status indicator (draft/revised/final) | Should Have | Low | Dot or badge — configurable per card |
| Zoom in/out card size | Nice to Have | Low | CSS variable for card width, slider control |
| Split corkboard (horizontal/vertical) | Nice to Have | High | Show two folders side-by-side — powerful but complex |

---

## 3.4 Outline View

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Collapsible tree with synopses | Must Have | Medium | Table layout — title left, synopsis right |
| Inline synopsis editing | Must Have | Low | Click synopsis cell to edit in place |
| Status column | Should Have | Low | Dropdown: Not Started / Draft / Revised / Final |
| Word count column | Should Have | Low | Per-row word count pulled from document |
| Target word count column | Should Have | Low | Set per scene, show progress bar |
| Label column | Should Have | Low | Colour dot — same label system as corkboard |
| POV character column | Nice to Have | Low | Tag field, useful for novels with multiple POVs |

---

## 3.5 AI Writing Assistant _(Phase 3)_

Powered by the Anthropic Claude API. The user provides their own API key — stored in localStorage. No backend required.

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Claude API integration | Must Have | Medium | User provides own API key, stored in localStorage |
| Context-aware suggestions | Must Have | High | Send selected text + surrounding paragraphs as context |
| Scene brainstorming mode | Must Have | Medium | Prompt template: generate alternatives for selected scene |
| Prose polish / rewrite | Must Have | Medium | Rewrite in tighter prose, different tone, or simpler language |
| Character voice checker | Should Have | High | Compare dialogue against character profile notes |
| Plot summary generator | Should Have | Medium | Summarise entire manuscript chapter by chapter |
| Name generator | Should Have | Low | Genre-appropriate names for characters and places |
| 'Continue writing' mode | Should Have | Medium | Claude writes next 200 words in the author's established style |
| Plot hole detector | Nice to Have | High | Ambitious — requires full context window, worth adding in v2 |

---

## 3.6 Export & Sharing

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Export as plain text (.txt) | Must Have | Low | Blob download — simple |
| Export as Markdown (.md) | Must Have | Low | Strip HTML formatting, convert to Markdown |
| Export project as JSON backup | Must Have | Low | Serialise entire localStorage project as downloadable file |
| Import project from JSON | Must Have | Low | Restore from backup file |
| Export as formatted HTML | Should Have | Medium | Self-contained HTML file, readable in any browser |
| Manuscript PDF (print stylesheet) | Should Have | Medium | CSS `@media print` — standard submission format |
| Export individual scene as Markdown | Should Have | Low | Single document export for sharing |
| EPUB export | Nice to Have | High | Requires epub.js or similar — worth exploring post-launch |

---

## 3.7 UI, Themes & Settings

| Feature | Priority | Complexity | Notes |
|---|---|---|---|
| Dark mode / Light mode | Must Have | Low | CSS custom properties, system preference detection |
| Three-panel layout (Binder/Editor/Inspector) | Must Have | Medium | CSS Grid with collapsible panels |
| Collapsible panels (hide binder/inspector) | Must Have | Low | Toggle buttons, CSS transition |
| Responsive / mobile layout | Must Have | Medium | Single panel on mobile, swipe to navigate |
| Typeface selector (serif/sans/mono) | Should Have | Low | System fonts — Georgia, Arial, Courier |
| Font size control | Should Have | Low | CSS variable, slider or +/– buttons |
| Line spacing control | Should Have | Low | 1.5 / 2.0 / custom — CSS `line-height` variable |
| Custom accent colour | Nice to Have | Low | Single hue shift using HSL CSS variables |
| Ambient sound player (rain, café) | Nice to Have | Medium | Web Audio API or embedded audio — popular in writing apps |

---

## Data Model

All project data is stored as a single JSON object in `localStorage`:

```
Project
  id, title, createdAt, settings, labels[]

Document
  id, parentId, type (folder/doc), title, synopsis,
  content (HTML), wordCount, label, status, target, pov

Settings
  theme, font, fontSize, lineHeight, apiKey (encrypted)
```
