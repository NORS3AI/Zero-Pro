# Zero Pro — Features

Zero Pro is a browser-based writing environment for long-form writers. All features run entirely in the browser with no account required. Data is stored locally on the writer's device.

---

## Core Writing Experience

### Distraction-Free Editor
- Full-screen focus mode that hides all UI chrome except the document
- Adjustable typewriter mode: keeps the active line centered on screen
- Customizable editor width (narrow column to full-width)
- Light and dark themes, with a sepia "warm paper" option

### Rich Text Formatting
- Bold, italic, underline, and strikethrough
- Block-level elements: headings (H1–H3), blockquote, horizontal rule
- Ordered and unordered lists with nested levels
- Keyboard shortcuts for all formatting actions (standard Ctrl/Cmd conventions)
- Format paint: copy inline styles from one selection to another

### Word and Character Count
- Live word count, character count, and estimated reading time in the status bar
- Per-document and per-project totals
- Session word count: tracks words written since opening the editor
- Daily writing goal with a visual progress indicator

---

## Project and Document Organization (the Binder)

### Document Tree
- Hierarchical binder panel (sidebar) showing all documents and folders
- Drag-and-drop reordering of documents and folders
- Inline rename by double-clicking a document title
- Color labels for visual categorization
- Document icons distinguishing scenes, chapters, notes, and research items

### Document Types
- **Scene / Chapter**: primary writing documents
- **Folder**: grouping container; can have its own text
- **Research**: non-manuscript documents for notes, web clippings, images
- **Trash**: soft-delete with restore; permanently deleted on empty

### Corkboard View
- Visual index-card layout for all documents in the selected folder
- Cards show title, synopsis, and label color
- Drag-and-drop rearrangement synced back to the binder order
- Click a card to open the document in the editor

### Outliner View
- Flat or nested table view of documents with columns for title, synopsis, label, status, and word count
- Inline editing of synopsis directly in the outliner
- Sort by any column

---

## Writing Tools

### Snapshots (Version History)
- Take a named snapshot of any document at any point
- Compare two snapshots side-by-side with a color-coded diff
- Restore a previous snapshot with one click

### Comments and Annotations
- Inline comments attached to a text selection (rendered in a margin column)
- Highlight mode: mark passages in multiple colors for different purposes
- Annotations: bracketed inline notes stripped on export

### Scratchpad
- Persistent floating scratchpad panel for quick notes
- Independent of the binder; never exported with the manuscript

### Find and Replace
- Project-wide search across all documents
- Regex support with match highlighting
- Replace single occurrences or all at once
- Filter results by document type or label

### Name Generator
- Built-in name generator with first and last name lists filtered by region/style
- Insert directly into the document at cursor

---

## Project Management

### Metadata
- Per-document fields: title, synopsis, status (To Do / In Progress / Done / Revised), label, and custom keywords
- Project-level fields: author name, working title, genre, and target word count

### Writing Targets
- Project-level word count target with a visual progress bar
- Per-document targets
- Deadline mode: shows words-per-day needed to hit a goal by a set date

### Compile / Export
Export the full manuscript or a selection of documents to:
- Plain text (`.txt`)
- Markdown (`.md`)
- Rich Text Format (`.rtf`)
- Microsoft Word (`.docx`) via the `docx` library
- PDF (via the browser's print-to-PDF or a client-side renderer)

Compile settings:
- Include or exclude individual documents from compile
- Choose separator style between sections (blank line, scene break `***`, page break)
- Front matter (title page) inserted automatically
- Strip annotations and comments from compiled output

### Import
- Import existing `.txt` or `.md` files as new documents
- Import a folder of files as a structured binder with one document per file
- Paste-and-split: paste a large block of text and split it into scenes on a chosen delimiter (e.g., `###`)

---

## Storage and Sync

### Local Storage
- Projects are saved automatically to the browser's `localStorage` after every edit (debounced)
- A backup copy is written on every explicit save (Ctrl/Cmd+S)

### File System Access (Desktop Browsers)
- Open and save projects as `.zeropro` files (JSON format) directly on the local file system
- Auto-save writes back to the open file without prompting
- Portable: `.zeropro` files can be moved, backed up, or shared manually

### Offline Support
- A service worker caches all app assets on first load
- Full editing functionality is available with no internet connection

---

## Interface and Accessibility

### Layout
- Three-pane layout: Binder | Editor | Inspector
- Each pane can be shown, hidden, or resized
- Saved layout presets (e.g., "Writing mode", "Revision mode", "Research mode")

### Inspector Panel
- Shows metadata, synopsis, snapshot history, and comments for the active document
- Tabbed: Document / Project / Bookmarks / Comments

### Keyboard Navigation
- All major actions are reachable by keyboard
- Customizable keyboard shortcuts
- Command palette (Ctrl/Cmd+K) for fuzzy-searching any action or document

### Themes and Typography
- System font stack by default; configurable editor font and size
- Line height and paragraph spacing controls
- Full light / dark / sepia theme support, following the OS preference by default

### Accessibility
- ARIA labels on all interactive controls
- Focus ring visible in all themes
- Screen reader-tested navigation for the binder and editor
