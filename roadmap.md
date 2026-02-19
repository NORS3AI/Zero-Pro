# Zero Pro — Product Roadmap

The project is structured into four phases, each delivering a usable, shippable product. Each phase builds on the last without requiring the next to be valuable.

| Phase | Timeline | Goal | Status |
|---|---|---|---|
| Phase 1 | Weeks 1–3 | Core editor with project binder and local storage | **Start Here** |
| Phase 2 | Weeks 4–6 | Corkboard, outline view, and scene metadata | Next |
| Phase 3 | Weeks 7–10 | AI writing assistant (Claude API integration) | Planned |
| Phase 4 | Weeks 11–14 | Export, themes, and App Store wrapper (WKWebView) | Future |

---

## Phase 1 — The Writing Foundation _(Weeks 1–3)_

The goal of Phase 1 is to make Zero Pro genuinely useful as a daily writing tool before any of the 'fancy' features are added. A writer should be able to create a project, organise it into chapters and scenes, write in a distraction-free editor, and come back the next day with everything intact.

- [ ] Three-panel layout: Binder (left), Editor (centre), Inspector (right)
- [ ] Binder: hierarchical project tree — folders (Parts/Acts), documents (Chapters), subdocuments (Scenes)
- [ ] Rich text editor with basic formatting: bold, italic, heading styles, paragraph indent
- [ ] Word count per document and project total
- [ ] localStorage persistence — projects survive browser refresh
- [ ] Export single document as plain text
- [ ] Focus / typewriter mode — dims everything except the current paragraph
- [ ] Dark mode and light mode toggle

---

## Phase 2 — The Corkboard & Structure _(Weeks 4–6)_

Phase 2 adds the visual planning tools that set Zero Pro apart from a simple editor. The corkboard is Scrivener's most iconic feature and Zero Pro's opportunity to do it better on the web.

- [ ] Corkboard view: drag-and-drop index cards for each scene
  - Cards show title, synopsis, and word count badge
  - Colour-coded labels (e.g., POV character, act, status)
  - Tap to open scene directly in editor
- [ ] Outline view: collapsible tree with inline synopses
- [ ] Scene Inspector panel: status, POV, location, custom tags
- [ ] Manuscript targets: set word count goals per chapter and project
- [ ] Writing session timer and daily word count tracker
- [ ] Project notes panel (world-building, research links, character notes)

---

## Phase 3 — AI Writing Assistant _(Weeks 7–10)_

Phase 3 integrates Claude via the Anthropic API to give writers an intelligent creative partner. This is a major differentiator — no Scrivener-tier tool offers this natively. The user supplies their own Anthropic API key; no backend is required.

- [ ] 'Ask Claude' sidebar: context-aware suggestions based on selected text
- [ ] Scene brainstorming: 'Give me 5 ways this scene could go differently'
- [ ] Character consistency checker: flag when a character acts out of established traits
- [ ] Prose polish: rewrite a paragraph in a different style or tighten pacing
- [ ] Plot hole detector: summarise the manuscript and flag logical gaps
- [ ] Name generator for characters, places, organisations
- [ ] 'Continue writing' mode: Claude writes the next 200 words in the author's style
- [ ] API key settings panel (key stored in localStorage)

---

## Phase 4 — Export, Polish & Distribution _(Weeks 11–14)_

Phase 4 prepares Zero Pro for broader distribution and optional monetisation.

- [ ] Export to: Markdown, plain text, HTML, formatted PDF (via print stylesheet)
- [ ] Manuscript formatter: standard submission format (12pt Times, double-spaced, headers)
- [ ] Multiple project workspaces
- [ ] Cloud backup: export/import entire project as a single JSON file
- [ ] Custom themes: font, line height, colour palette
- [ ] iOS App Store version: WKWebView wrapper via Xcode
- [ ] Optional Pro tier: sync via a simple backend (Supabase or Cloudflare Workers)

---

## Claude Code Build Order

Recommended session sequence for building Zero Pro with Claude Code:

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

## Post-Launch Backlog

Ideas under consideration after the v1.0 release. Not committed to any phase.

- **Real-time collaboration** — shared editing via WebRTC or a lightweight WebSocket server
- **Writing statistics** — historical word count graphs and streak tracking
- **Scratchpad** — persistent floating notepad independent of the binder
- **Typewriter scrolling** — keep the active line centred on screen
- **Plugin API** — allow third-party extensions to add binder item types or export formats
- **Text-to-speech** — read back the current document using the Web Speech API
- **Writing prompts** — built-in prompt generator to help beat writer's block
- **EPUB export** — package the compiled manuscript as an `.epub` file
- **Fountain / Final Draft support** — screenplay formatting mode
- **Split corkboard** — show two folders side-by-side

---

## Contributing

Open an issue on GitHub with the `roadmap` label to suggest new features or vote on existing ones. Bug reports and pull requests are welcome at any phase.
