// app.js — Application entry point and orchestration
// Phase 8: Cloud Sync, Collaboration & PWA

import { loadProject, createProject, saveProject, getDocument, createDocument } from './storage.js';
import { applyTheme, toggleTheme, showToast, showPrompt } from './ui.js';
import { initBinder, renderBinder } from './binder.js';
import { initEditor, loadDocument, saveCurrentContent, toggleFocusMode, insertImageInEditor, copyFormat, applyFormat } from './editor.js';
import { exportAsTxt, exportAsMd, exportAsDocx, exportAsDoc, exportProjectJson } from './export.js';
import { importTxt, importMd, importProjectJson, initImport } from './import.js';
import { initCorkboard, renderCorkboard, toggleSplitCorkboard } from './corkboard.js';
import { initOutline, renderOutline } from './outline.js';
import { initInspector, updateInspector } from './inspector.js';
import { initAI, toggleAIPanel } from './ai.js';
import { initFindReplace, openFindReplace, openProjectSearch } from './find-replace.js';
import { initCommandPalette } from './command-palette.js';
import { initSettings, openSettings, applyEditorSettings, applyAccentHue, applyPanelColors, applyUiFont, applyHighContrast, applyRTL } from './settings.js';
import { openCompileWizard } from './compile.js';
import { enableMarkdownMode, disableMarkdownMode, isMarkdownMode, getMarkdownContent, htmlToMarkdown, markdownToHtml } from './markdown-mode.js';
import { openPatchNotes } from './patchnotes.js';
import {
  initPublish, exportAsEpub,
  openKdpWizard, openIngramWizard, openSubmissionFormatter,
  openSelfPublishChecklist, openGenreGuides, openFrontMatterTemplates,
} from './publish.js';
import { initMedia } from './media.js';
import { initSnapshots, openSnapshots, takeSnapshot } from './snapshots.js';
import { initSnapshotBrowser, openSnapshotBrowser } from './snapshot-browser.js';
import { initTimeline, renderTimeline } from './timeline.js';
import { initPdfViewer, loadPdfDoc, refreshPdfView, triggerPdfImport, togglePdfHighlightMode, setPdfColor, goPdfPage, setPdfScale } from './pdf-viewer.js';
import { initAmbient, openAmbientPanel } from './ambient.js';
import { initStreak, openStreakCalendar, trackWordsWritten, resetWordBaseline } from './streak.js';
import { initSync, pushProject, openSyncPanel, isSyncEnabled } from './sync.js';
import { initCollab, openCollabPanel, notifyTyping } from './collab.js';
import { initTouch } from './touch.js';
import { maybeShowWizard } from './wizard.js';
import { initToolbarLoop } from './toolbar-loop.js';
import { isBinderPinned } from './binder.js';
import { openStatsPanel } from './stats.js';
import { registerKeybindings, openShortcutsPanel } from './keybindings.js';
import { initWebhooks, openWebhooksPanel, fireWebhook, openBatchRename } from './webhooks.js';
import { openPromptLibrary } from './prompt-library.js';
import { initCharacters, openCharacterDatabase, ensureCharacters } from './characters.js';
import { initWikiLinks, activateWikiLinks } from './wiki-links.js';
import { initPlotTemplates, openPlotTemplates } from './plot-templates.js';
import { openProjectTemplates } from './project-templates.js';
import { initSprint, toggleSprintPanel, sprintOnDocChange } from './sprint.js';
import { initReadingMode, openReadingMode, openManuscriptView, closeReadingMode } from './reading-mode.js';
import { initSmartType, updateSmartTypeSettings } from './smart-type.js';
import { initSplitEditor, toggleSplitEditor, refreshSplitPane } from './split-editor.js';

// ─── Application State ────────────────────────────────────────────────────────

const state = {
  project:              null,
  currentDocId:         null,
  currentView:          'corkboard', // 'editor' | 'corkboard' | 'outline' | 'timeline' | 'pdf'
  triggerDocImport:     null,
  triggerProjectImport: null,
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

function init() {
  state.project = loadProject();
  if (!state.project) {
    state.project = createProject('My Novel');
    saveProject(state.project);
  }

  applyTheme(state.project.settings.theme);
  applyEditorSettings(state.project.settings);
  if (state.project.settings.accentHue != null) applyAccentHue(state.project.settings.accentHue);
  applyPanelColors(state.project.settings);
  if (state.project.settings.uiFont) applyUiFont(state.project.settings.uiFont);
  applyHighContrast(state.project.settings);
  applyRTL(state.project.settings);
  ensureCharacters(state.project); // Phase 12: ensure characters array exists

  // Init all modules
  initBinder({
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
    onInsertImageInEditor: (src, alt) => insertImageInEditor(src, alt),
  });

  initEditor({
    onDocChange: handleDocChange,
  });

  initCorkboard({
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
  });

  initOutline({
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
  });

  initInspector({
    onDocChange:     handleDocChange,
    onProjectChange: handleProjectChange,
  });

  initAI({
    getProject:    () => state.project,
    getCurrentDoc: () => currentDoc(),
  });

  const { triggerDocImport, triggerProjectImport } = initImport({
    onImportDocs:       _handleImportDocs,
    onRestoreProject:   _handleRestoreProject,
  });
  state.triggerDocImport     = triggerDocImport;
  state.triggerProjectImport = triggerProjectImport;

  initFindReplace({
    getEditor:   () => document.getElementById('editor'),
    getProject:  () => state.project,
    onSelectDoc: handleSelectDocument,
  });

  initCommandPalette({
    getProject:  () => state.project,
    onSelectDoc: handleSelectDocument,
    getActions:  () => [
      { icon: '📄', label: 'New Document',       hint: '',          run: () => document.querySelector('[data-action="add-doc"]')?.click() },
      { icon: '📁', label: 'New Folder',          hint: '',          run: () => document.querySelector('[data-action="add-folder"]')?.click() },
      { icon: '🔍', label: 'Find & Replace',      hint: 'Ctrl+F',   run: () => openFindReplace(false) },
      { icon: '✏️', label: 'Find & Replace',      hint: 'Ctrl+H',   run: () => openFindReplace(true) },
      { icon: '🎯', label: 'Toggle Focus Mode',   hint: 'Ctrl+F2',  run: () => document.getElementById('btn-focus')?.click() },
      { icon: '☀️', label: 'Toggle Theme',        hint: '',          run: () => document.getElementById('btn-theme')?.click() },
      { icon: '📊', label: 'Corkboard View',      hint: '',          run: () => switchView('corkboard') },
      { icon: '📋', label: 'Outline View',        hint: '',          run: () => switchView('outline') },
      { icon: '📝', label: 'Editor View',         hint: '',          run: () => switchView('editor') },
      { icon: '💾', label: 'Export as TXT',       hint: '',          run: () => document.getElementById('btn-export-txt')?.click() },
      { icon: '💾', label: 'Export as Markdown',  hint: '',          run: () => document.getElementById('btn-export-md')?.click() },
      { icon: '💾', label: 'Backup Project',      hint: '.json',     run: () => document.getElementById('btn-export-json')?.click() },
      { icon: '⚙️', label: 'Settings',            hint: 'Ctrl+,',   run: () => openSettings() },
      { icon: '📚', label: 'Export as EPUB',      hint: '',          run: async () => { await exportAsEpub(state.project); showToast('EPUB exported'); } },
      { icon: '📖', label: 'KDP Wizard',          hint: '',          run: () => openKdpWizard(state.project) },
      { icon: '🖨️', label: 'IngramSpark Wizard',  hint: '',          run: () => openIngramWizard(state.project) },
      { icon: '✉️', label: 'Agent Submission',    hint: '',          run: () => openSubmissionFormatter(state.project) },
      { icon: '✅', label: 'Self-Pub Checklist',  hint: '',          run: () => openSelfPublishChecklist() },
      { icon: '📕', label: 'Genre Style Guides',  hint: '',          run: () => openGenreGuides() },
      { icon: '📄', label: 'Front/Back Matter',   hint: '',          run: () => openFrontMatterTemplates(state.project) },
      { icon: '🔎', label: 'Project Search',      hint: 'Ctrl+Shift+F', run: () => openProjectSearch() },
      { icon: '📸', label: 'Take Snapshot',        hint: '',          run: () => takeSnapshot() },
      { icon: '📜', label: 'Revision History',     hint: '',          run: () => openSnapshots() },
      { icon: '🎨', label: 'Format Paint',         hint: '',          run: () => copyFormat() },
      { icon: '🔊', label: 'Ambient Sounds',       hint: '',          run: () => openAmbientPanel() },
      { icon: '🔥', label: 'Writing Streak',       hint: '',          run: () => openStreakCalendar() },
      { icon: '📅', label: 'Timeline View',        hint: '',          run: () => switchView('timeline') },
      { icon: '📂', label: 'Snapshot Browser',     hint: '',          run: () => openSnapshotBrowser() },
      { icon: '📊', label: 'Writing Statistics',   hint: 'Ctrl+⇧D',  run: () => openStatsPanel() },
      { icon: '⌨️', label: 'Keyboard Shortcuts',   hint: 'Ctrl+?',   run: () => openShortcutsPanel() },
      { icon: '🔗', label: 'Webhooks & Automation', hint: '',         run: () => openWebhooksPanel() },
      { icon: '🔤', label: 'Batch Rename Scenes',  hint: '',          run: () => { const doc = currentDoc(); openBatchRename(doc?.type === 'folder' ? doc.id : (doc?.parentId ?? null)); } },
      { icon: '📋', label: 'Prompt Library',       hint: '',          run: () => openPromptLibrary(() => {}) },
      { icon: '🧑‍🤝‍🧑', label: 'Character Database',  hint: '',          run: () => openCharacterDatabase() },
      { icon: '🎭', label: 'Plot Templates',       hint: '',          run: () => openPlotTemplates() },
      { icon: '✨', label: 'New Project from Template', hint: '',     run: () => _openProjectTemplateWizard() },
      { icon: '⏱️', label: 'Writing Sprint Timer',      hint: '',     run: () => document.getElementById('btn-sprint')?.click() },
      { icon: '📖', label: 'Reading Mode',              hint: '',     run: () => openReadingMode() },
      { icon: '📜', label: 'Manuscript View',           hint: '',     run: () => openManuscriptView() },
      { icon: '⬛', label: 'Split Editor',              hint: '',     run: () => document.getElementById('btn-split')?.click() },
    ],
  });

  initSettings({
    getProject:       () => state.project,
    onSettingsChange: project => {
      state.project = project;
    },
  });

  initMedia({
    getProject:      () => state.project,
    onProjectChange: handleProjectChange,
    renderBinder:    (project, id) => renderBinder(project, id ?? state.currentDocId),
  });

  initSnapshots({
    getProject:    () => state.project,
    getCurrentDoc: () => currentDoc(),
    onDocRestore:  (docId) => {
      const doc = getDocument(state.project, docId);
      if (doc) loadDocument(state.project, doc);
    },
  });

  initAmbient();

  initStreak({
    getProject: () => state.project,
  });

  // ── Phase 10 ─────────────────────────────────────────────────────────────────
  initTimeline({
    getProject:      () => state.project,
    onSelectDoc:     handleSelectDocument,
    onProjectChange: handleProjectChange,
  });

  initPdfViewer({
    getProject:        () => state.project,
    onAnnotationChange: handleProjectChange,
  });

  initSnapshotBrowser({
    getProject:    () => state.project,
    getCurrentDoc: () => currentDoc(),
    onDocRestore:  (docId) => {
      const doc = getDocument(state.project, docId);
      if (doc) loadDocument(state.project, doc);
    },
  });

  // ── Phase 11 ─────────────────────────────────────────────────────────────────
  initWebhooks({
    getProject:      () => state.project,
    onProjectChange: handleProjectChange,
  });

  // Register global keybindings (Ctrl+? opens shortcuts panel, Ctrl+Shift+D opens stats, etc.)
  registerKeybindings({
    'focus':       () => document.getElementById('btn-focus')?.click(),
    'md-mode':     () => document.getElementById('btn-md-mode')?.click(),
    'snapshot':    () => takeSnapshot(),
    'view-editor':    () => switchView('editor'),
    'view-corkboard': () => switchView('corkboard'),
    'view-outline':   () => switchView('outline'),
    'view-timeline':  () => switchView('timeline'),
    'compile':     () => openCompileWizard(state.project),
    'ai-panel':    () => toggleAIPanel(),
    'stats':       () => openStatsPanel(),
    'shortcuts':   () => openShortcutsPanel(),
  });

  // ── Phase 12 ─────────────────────────────────────────────────────────────────
  initCharacters({
    getProject:      () => state.project,
    onProjectChange: handleProjectChange,
  });

  initPlotTemplates({
    getProject:      () => state.project,
    onProjectChange: handleProjectChange,
  });

  initWikiLinks({
    getProject:  () => state.project,
    onNavigate:  handleSelectDocument,
  });

  // ── Phase 13 ─────────────────────────────────────────────────────────────────
  initSprint({
    getCurrentWordCount: () => {
      const doc = currentDoc();
      return doc?.wordCount ?? 0;
    },
  });

  initReadingMode({
    getProject:    () => state.project,
    getCurrentDoc: () => currentDoc(),
  });

  initSplitEditor({
    getProject: () => state.project,
  });

  // Smart typography — attach after editor DOM is ready
  requestAnimationFrame(() => {
    const editorEl = document.getElementById('editor');
    if (editorEl) {
      initSmartType(editorEl, state.project.settings ?? {});
    }
  });

  initPublish({
    getProject: () => state.project,
    onAddDoc: (title, content) => {
      const doc = createDocument(state.project, { type: 'doc', parentId: null, title });
      doc.content = content;
      saveProject(state.project);
      renderBinder(state.project, state.currentDocId);
      showToast(`"${title}" added to binder`);
    },
  });

  // ── Phase 8: Sync, Collab, Touch ────────────────────────────────────────────
  initSync({
    getProjectJson: () => JSON.stringify(state.project),
    onStatusChange: status => {
      // Show/hide offline banner
      document.body.classList.toggle('is-offline', status === 'offline');
    },
  });

  initCollab({
    onPresenceChange: _collabs => {
      // collab.js renders avatars directly via DOM
    },
  });

  initTouch({
    onSwitchView:    view => switchView(view),
    getViews:        () => ['corkboard', 'editor', 'outline', 'timeline'],
    getCurrentView:  () => state.currentView,
  });

  _initPWAInstallPrompt();

  // Render binder and open corkboard by default
  renderBinder(state.project, null);
  switchView('corkboard');

  bindToolbar();
  updateProjectTitle();

  // Infinite toolbar loop (activates only when toolbar overflows)
  initToolbarLoop();

  // Show first-run wizard (once)
  maybeShowWizard({
    onImport:      () => state.triggerDocImport?.(),
    onNewProject:  () => {
      state.project = createProject('My Novel');
      saveProject(state.project);
      renderBinder(state.project, null);
      updateProjectTitle();
      switchView('corkboard');
      showToast('New project created');
    },
  });
}

// ─── View Switching ───────────────────────────────────────────────────────────

function switchView(view) {
  state.currentView = view;

  // Update toolbar button states
  ['editor', 'corkboard', 'outline', 'timeline'].forEach(v => {
    const b = document.getElementById(`btn-view-${v}`);
    if (b) {
      b.classList.toggle('active', v === view);
      b.setAttribute('aria-pressed', v === view ? 'true' : 'false');
    }
  });

  // Show / hide view panes
  document.querySelectorAll('.view-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `${view}-pane`);
  });

  _announce(`Switched to ${view} view`);

  // Render the newly-visible view
  const doc = state.currentDocId ? getDocument(state.project, state.currentDocId) : null;
  _renderView(view, doc);
}

function _renderView(view, doc) {
  if (view === 'editor') {
    // Always clean up markdown mode before loading a new doc
    if (isMarkdownMode()) disableMarkdownMode();

    loadDocument(state.project, doc);
    _syncStatusBar(doc);
    // Activate wiki links in the freshly-loaded editor
    activateWikiLinks(document.getElementById('editor'));

    // Re-enable markdown mode if the loaded doc is in markdown mode
    if (doc?.mode === 'markdown') {
      enableMarkdownMode(doc, md => {
        doc.content = md;
        handleDocChange(doc);
      });
    }

    // Sync the MD toggle button state
    const mdBtn = document.getElementById('btn-md-mode');
    const isMd  = doc?.mode === 'markdown';
    if (mdBtn) {
      mdBtn.setAttribute('aria-pressed', String(isMd));
      mdBtn.classList.toggle('md-active', isMd);
    }

  } else if (view === 'corkboard') {
    if (isMarkdownMode()) disableMarkdownMode();
    const parentId = _corkboardParentId(doc);
    renderCorkboard(state.project, parentId);
  } else if (view === 'outline') {
    if (isMarkdownMode()) disableMarkdownMode();
    renderOutline(state.project);
  } else if (view === 'timeline') {
    if (isMarkdownMode()) disableMarkdownMode();
    renderTimeline(state.project);
  } else if (view === 'pdf') {
    if (isMarkdownMode()) disableMarkdownMode();
    if (doc?.type === 'pdf') loadPdfDoc(doc, state.project);
  }
  updateInspector(state.project, doc?.type === 'doc' ? doc : null);
}

/** Determine the parent folder to show in corkboard for the current selection */
function _corkboardParentId(doc) {
  if (!doc) return null;
  return doc.type === 'folder' ? doc.id : (doc.parentId ?? null);
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function handleSelectDocument(docId) {
  // Close the binder drawer on compact screens after a selection (unless pinned)
  if (_isCompact() && !isBinderPinned()) workspace().classList.remove('binder-open');

  // Flush markdown textarea content before saving (bypasses the 800 ms debounce)
  if (isMarkdownMode()) {
    const md  = getMarkdownContent();
    const doc = currentDoc();
    if (doc && md !== null) { doc.content = md; handleDocChange(doc); }
  }

  saveCurrentContent();
  state.currentDocId = docId;
  const doc = docId ? getDocument(state.project, docId) : null;
  resetWordBaseline(doc?.wordCount || 0);

  // Clicking a PDF doc → switch to PDF viewer
  if (doc?.type === 'pdf' && state.currentView !== 'pdf') {
    switchView('pdf');
    return;
  }

  // Clicking a scene card in corkboard or an outline row → switch to editor
  if (doc?.type === 'doc' && state.currentView !== 'editor') {
    switchView('editor');
    return; // switchView → _renderView handles the rest
  }

  _renderView(state.currentView, doc);
  _syncStatusBar(doc);
}

function handleProjectChange(project) {
  state.project = project;
  updateProjectTitle();
  renderBinder(state.project, state.currentDocId);

  // Refresh whichever view is active (except editor — it autosaves itself)
  const doc = state.currentDocId ? getDocument(state.project, state.currentDocId) : null;
  if (state.currentView === 'corkboard') {
    renderCorkboard(state.project, _corkboardParentId(doc));
  } else if (state.currentView === 'outline') {
    renderOutline(state.project);
  } else if (state.currentView === 'timeline') {
    renderTimeline(state.project);
  }
  updateInspector(state.project, doc?.type === 'doc' ? doc : null);
}

function handleDocChange(project, doc) {
  state.project = project;
  updateInspector(state.project, doc?.type === 'doc' ? doc : null);
  // Track words for writing streak
  if (doc?.wordCount) trackWordsWritten(doc.wordCount);
  // Update sprint timer word count
  sprintOnDocChange(doc?.wordCount ?? 0);
  // Refresh split pane if open
  refreshSplitPane();
  // Notify collaborators
  notifyTyping();
  // Debounced cloud sync
  _scheduleSyncPush();
}

let _syncPushTimer = null;
function _scheduleSyncPush() {
  clearTimeout(_syncPushTimer);
  _syncPushTimer = setTimeout(async () => {
    if (isSyncEnabled()) {
      await pushProject(JSON.stringify(state.project));
    }
    // Fire on_save webhook (best-effort, silently ignored if no URL configured)
    fireWebhook('on_save', { wordCount: state.project?.documents?.reduce((s, d) => s + (d.wordCount || 0), 0) });
  }, 5000);
}

// ─── Toolbar Wiring ───────────────────────────────────────────────────────────

function bindToolbar() {
  // Panel toggles — compact (tablet/mobile) uses overlay drawers; desktop uses grid collapse
  btn('btn-toggle-binder', () => {
    if (_isCompact()) {
      const opening = workspace().classList.toggle('binder-open');
      if (opening) workspace().classList.remove('inspector-open');
    } else {
      workspace().classList.toggle('binder-hidden');
    }
  });

  btn('btn-toggle-inspector', () => {
    if (_isCompact()) {
      const opening = workspace().classList.toggle('inspector-open');
      if (opening) workspace().classList.remove('binder-open');
    } else {
      workspace().classList.toggle('inspector-hidden');
    }
  });

  // Close buttons inside drawers (mobile / tablet)
  btn('btn-close-binder',    () => workspace().classList.remove('binder-open'));
  btn('btn-close-inspector', () => workspace().classList.remove('inspector-open'));

  // View switcher
  btn('btn-view-editor',    () => switchView('editor'));
  btn('btn-view-corkboard', () => switchView('corkboard'));
  btn('btn-view-outline',   () => switchView('outline'));
  btn('btn-view-timeline',  () => switchView('timeline'));

  // AI panel — on compact screens close other drawers first
  btn('btn-ai', () => {
    if (_isCompact()) workspace().classList.remove('binder-open', 'inspector-open');
    toggleAIPanel();
  });

  // Mobile backdrop tap — close all drawers
  document.getElementById('mobile-backdrop')?.addEventListener('click', _closeAllDrawers);

  // Theme
  btn('btn-theme', () => {
    const theme = toggleTheme(state.project);
    saveProject(state.project);
    const b = document.getElementById('btn-theme');
    if (b) b.title = theme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
  });

  // Settings
  btn('btn-settings', () => openSettings());

  // Patch Notes
  btn('btn-changelog', () => openPatchNotes());

  // Focus mode (editor only)
  btn('btn-focus', () => {
    const on = toggleFocusMode();
    document.getElementById('btn-focus')?.classList.toggle('active', on);
    document.getElementById('btn-focus')?.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  // Export dropdown toggle — position: fixed so overflow-y: hidden on the
  // toolbar scroll track can't clip it
  btn('btn-export', () => {
    const dropdown = document.getElementById('export-dropdown');
    const btnEl    = document.getElementById('btn-export');
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle('open');
    if (isOpen && btnEl) {
      const r = btnEl.getBoundingClientRect();
      dropdown.style.top  = (r.bottom + 4) + 'px';
      dropdown.style.left = r.left + 'px';
    }
  });

  // Close export dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#export-menu')) {
      document.getElementById('export-dropdown')?.classList.remove('open');
    }
  });

  // Export formats
  btn('btn-export-txt', () => {
    const doc = currentDoc();
    if (doc) { exportAsTxt(doc); showToast('Exported as .txt'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-md', () => {
    const doc = currentDoc();
    if (doc) { exportAsMd(doc); showToast('Exported as .md'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-docx', () => {
    const doc = currentDoc();
    if (doc) { exportAsDocx(doc); showToast('Exported as .docx'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-doc', () => {
    const doc = currentDoc();
    if (doc) { exportAsDoc(doc); showToast('Exported as .doc'); }
    else showToast('No document selected');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-export-json', () => {
    exportProjectJson(state.project);
    showToast('Project backup saved');
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-import-docs', () => {
    state.triggerDocImport?.();
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  btn('btn-import-json', () => {
    state.triggerProjectImport?.();
    document.getElementById('export-dropdown')?.classList.remove('open');
  });

  // ── Publish (Phase 5) ──────────────────────────────────────────────────────
  const _closeExport = () => document.getElementById('export-dropdown')?.classList.remove('open');

  btn('btn-export-epub', async () => {
    _closeExport();
    await exportAsEpub(state.project);
    showToast('EPUB exported');
  });

  btn('btn-pub-kdp', () => {
    _closeExport();
    openKdpWizard(state.project);
  });

  btn('btn-pub-ingram', () => {
    _closeExport();
    openIngramWizard(state.project);
  });

  btn('btn-pub-submission', () => {
    _closeExport();
    openSubmissionFormatter(state.project);
  });

  btn('btn-pub-checklist', () => {
    _closeExport();
    openSelfPublishChecklist();
  });

  btn('btn-pub-genres', () => {
    _closeExport();
    openGenreGuides();
  });

  btn('btn-pub-frontmatter', () => {
    _closeExport();
    openFrontMatterTemplates(state.project);
  });

  // ── Phase 7 ─────────────────────────────────────────────────────────────────

  // Format paint (click once to copy, click again to apply)
  btn('btn-format-paint', () => {
    const fpBtn = document.getElementById('btn-format-paint');
    if (fpBtn?.classList.contains('active')) {
      applyFormat();
    } else {
      copyFormat();
    }
  });

  // Split corkboard
  btn('btn-cork-split', () => toggleSplitCorkboard());

  // ── Phase 8 ─────────────────────────────────────────────────────────────────

  // Collab / Share button
  btn('btn-collab', () => openCollabPanel());

  // PWA install button
  btn('btn-pwa-install', () => {
    if (state._pwaPrompt) {
      state._pwaPrompt.prompt();
      state._pwaPrompt.userChoice.then(() => {
        state._pwaPrompt = null;
        document.getElementById('pwa-install-banner')?.classList.remove('visible');
      });
    }
  });
  btn('btn-pwa-dismiss', () => {
    document.getElementById('pwa-install-banner')?.classList.remove('visible');
    localStorage.setItem('zp_pwa_dismissed', '1');
  });

  // ── Phase 9 ─────────────────────────────────────────────────────────────────

  // Compile wizard
  btn('btn-compile', () => openCompileWizard(state.project));

  // Markdown mode toggle
  btn('btn-md-mode', () => {
    const doc = currentDoc();
    if (!doc) { showToast('Select a document first'); return; }

    if (doc.mode !== 'markdown') {
      // Switch to Markdown mode — convert existing HTML to plain text Markdown
      saveCurrentContent();
      const md = htmlToMarkdown(doc.content || '');
      doc.mode    = 'markdown';
      doc.content = md;
      handleDocChange(doc);
      if (isMarkdownMode()) disableMarkdownMode();
      enableMarkdownMode(doc, newMd => {
        doc.content = newMd;
        handleDocChange(doc);
      });
      document.getElementById('btn-md-mode')?.classList.add('md-active');
      document.getElementById('btn-md-mode')?.setAttribute('aria-pressed', 'true');
      showToast('Markdown mode — editing as plain text');
    } else {
      // Switch back to rich text — parse Markdown → HTML
      const md   = getMarkdownContent() ?? doc.content ?? '';
      doc.mode    = 'rich';
      doc.content = markdownToHtml(md);
      handleDocChange(doc);
      disableMarkdownMode();
      loadDocument(state.project, doc);
      document.getElementById('btn-md-mode')?.classList.remove('md-active');
      document.getElementById('btn-md-mode')?.setAttribute('aria-pressed', 'false');
      showToast('Rich text mode restored');
    }
  });

  // ── Phase 10 ─────────────────────────────────────────────────────────────────

  // PDF viewer controls
  btn('pdf-highlight-mode-btn', () => togglePdfHighlightMode());

  document.querySelectorAll('.pdf-color-btn').forEach(b => {
    b.addEventListener('click', () => setPdfColor(b.dataset.color));
  });

  btn('pdf-prev-btn', () => {
    const inp = document.getElementById('pdf-page-input');
    const cur = parseInt(inp?.value ?? '1', 10);
    goPdfPage(cur - 1);
  });

  btn('pdf-next-btn', () => {
    const inp = document.getElementById('pdf-page-input');
    const cur = parseInt(inp?.value ?? '1', 10);
    goPdfPage(cur + 1);
  });

  document.getElementById('pdf-page-input')?.addEventListener('change', e => {
    goPdfPage(parseInt(e.target.value, 10) || 1);
  });

  document.getElementById('pdf-zoom-select')?.addEventListener('change', e => {
    setPdfScale(parseFloat(e.target.value) || 1.5);
  });

  btn('pdf-import-btn', () => {
    const doc = currentDoc();
    if (doc?.type === 'pdf') triggerPdfImport(doc, state.project);
    else showToast('Select a PDF document in the binder first');
  });

  // Snapshot Browser
  btn('btn-snapshot-browser', () => openSnapshotBrowser());

  // ── Phase 11 ─────────────────────────────────────────────────────────────────

  // Writing Statistics
  btn('btn-stats', () => openStatsPanel());

  // Keyboard shortcuts reference
  btn('btn-shortcuts', () => openShortcutsPanel());

  // Webhooks / automation panel
  btn('btn-webhooks', () => openWebhooksPanel());

  // Prompt library (opened from AI panel "📋" button wired in ai.js, or command palette)
  btn('btn-prompt-library', () => openPromptLibrary(text => {
    // Insert chosen prompt text into AI panel textarea
    const ta = document.getElementById('ai-prompt');
    if (ta) { ta.value = text; ta.focus(); }
  }));

  // Snapshot with webhook fire
  btn('btn-snapshot', () => {
    takeSnapshot();
    fireWebhook('on_snapshot', { docTitle: currentDoc()?.title ?? '' });
  });

  // ── Phase 12 ─────────────────────────────────────────────────────────────────

  // Character database
  btn('btn-characters', () => openCharacterDatabase());

  // Plot structure templates
  btn('btn-plot-templates', () => openPlotTemplates());

  // New project from template
  btn('btn-new-from-template', () => _openProjectTemplateWizard());

  // ── Phase 13 ─────────────────────────────────────────────────────────────────

  // Writing Sprint Timer
  btn('btn-sprint', () => {
    const open = toggleSprintPanel();
    document.getElementById('btn-sprint')?.classList.toggle('active', open);
  });

  // Reading Mode
  btn('btn-reading-mode', () => openReadingMode());

  // Split Editor
  btn('btn-split', () => {
    const active = toggleSplitEditor();
    document.getElementById('btn-split')?.classList.toggle('active', active);
    document.getElementById('btn-split')?.setAttribute('aria-pressed', String(active));
  });

  // Double-click project title to rename
  document.getElementById('project-title')?.addEventListener('dblclick', () => {
    showPrompt('Rename Project', 'Project title', state.project.title, newTitle => {
      state.project.title = newTitle;
      saveProject(state.project);
      updateProjectTitle();
      renderBinder(state.project, state.currentDocId);
    });
  });

  // Ctrl/Cmd+S — force-save
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentContent();
      saveProject(state.project);
      showToast('Saved');
      _announce('Project saved');
      // Push to cloud if sync is enabled
      if (isSyncEnabled()) {
        pushProject(JSON.stringify(state.project));
      }
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function btn(id, handler) {
  document.getElementById(id)?.addEventListener('click', handler);
}

function workspace() {
  return document.getElementById('workspace');
}

/** True when in tablet or mobile layout (panels are overlay drawers). */
function _isCompact() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

/** Close every open drawer and hide the backdrop. */
function _closeAllDrawers() {
  workspace().classList.remove('binder-open', 'inspector-open');
  // Also close AI panel if open
  const aiPanel = document.getElementById('ai-panel');
  if (workspace().classList.contains('ai-open')) {
    workspace().classList.remove('ai-open');
    aiPanel?.setAttribute('aria-hidden', 'true');
    document.getElementById('btn-ai')?.classList.remove('active');
    document.getElementById('btn-ai')?.setAttribute('aria-pressed', 'false');
  }
}

// Restore clean state when resizing between compact and desktop
window.matchMedia('(max-width: 1023px)').addEventListener('change', e => {
  if (e.matches) {
    // Entering compact: remove desktop-only hidden classes
    workspace().classList.remove('binder-hidden', 'inspector-hidden');
  } else {
    // Entering desktop: remove compact drawer-open classes
    workspace().classList.remove('binder-open', 'inspector-open');
  }
});

function currentDoc() {
  return state.currentDocId ? getDocument(state.project, state.currentDocId) : null;
}

/** Open the project template wizard, then reload the whole app state. */
function _openProjectTemplateWizard() {
  openProjectTemplates({
    onApply: (project) => {
      state.project    = project;
      state.currentDocId = null;
      ensureCharacters(project);
      applyTheme(project.settings?.theme);
      renderBinder(project, null);
      loadDocument(project, null);
      updateProjectTitle();
      switchView('corkboard');
    },
  });
}

/** Announce a message to screen readers via the ARIA live region. */
function _announce(msg) {
  const el = document.getElementById('aria-status');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

function updateProjectTitle() {
  const el = document.getElementById('project-title');
  if (el) el.textContent = state.project.title;
}

function _syncStatusBar(doc) {
  const titleEl = document.getElementById('current-doc-title');
  if (titleEl) titleEl.textContent = doc?.title ?? '';
}

// ─── Phase 8 Helpers ──────────────────────────────────────────────────────────

/** Set up the PWA beforeinstallprompt event to show the custom banner. */
function _initPWAInstallPrompt() {
  if (localStorage.getItem('zp_pwa_dismissed')) return;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    state._pwaPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.classList.add('visible');
  });

  window.addEventListener('appinstalled', () => {
    state._pwaPrompt = null;
    document.getElementById('pwa-install-banner')?.classList.remove('visible');
    showToast('Zero Pro installed — find it on your home screen');
  });
}

// ─── Import Handlers ──────────────────────────────────────────────────────────

async function _handleImportDocs(files) {
  let added = 0;
  for (const file of files) {
    try {
      if (/\.(md|markdown)$/i.test(file.name)) {
        await importMd(file, state.project, null);
      } else {
        await importTxt(file, state.project, null);
      }
      added++;
    } catch {
      showToast(`Could not import "${file.name}"`);
    }
  }
  if (added > 0) {
    saveProject(state.project);
    renderBinder(state.project, state.currentDocId);
    showToast(`Imported ${added} document${added > 1 ? 's' : ''}`);
  }
}

async function _handleRestoreProject(file) {
  const { showConfirm } = await import('./ui.js');
  const project = await importProjectJson(file);
  if (!project) { showToast('Invalid backup file'); return; }
  showConfirm(
    `Replace "${state.project.title}" with "${project.title}"? This cannot be undone.`,
    () => {
      state.project    = project;
      state.currentDocId = null;
      saveProject(state.project);
      applyTheme(project.settings?.theme);
      renderBinder(state.project, null);
      loadDocument(state.project, null);
      updateProjectTitle();
      showToast('Project restored');
    }
  );
}

// ─── Start ────────────────────────────────────────────────────────────────────

init();
